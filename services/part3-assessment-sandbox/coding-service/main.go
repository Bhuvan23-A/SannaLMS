package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

type ExecutionRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
	Input    string `json:"input"`
	Timeout  int    `json:"timeout"` // Milliseconds
}

type ExecutionResponse struct {
	Status string `json:"status"` // "PASSED", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "COMPILE_ERROR", "RUNTIME_ERROR"
	Output string `json:"output"`
	Error  string `json:"error"`
}

var dockerClient *client.Client

func initDockerClient() {
	var err error
	dockerClient, err = client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to initialize Docker client: %v", err)
	}
	log.Println("Docker client initialized successfully")

	// Pre-pull images in background
	go prePullImages()
}

func prePullImages() {
	images := []string{
		"python:3.10-alpine",
		"gcc:12.2-alpine",
		"openjdk:17-alpine",
	}
	ctx := context.Background()
	for _, img := range images {
		log.Printf("Checking if image exists: %s", img)
		_, _, err := dockerClient.ImageInspectWithRaw(ctx, img)
		if err != nil {
			log.Printf("Pulling image: %s (this may take a few minutes)...", img)
			reader, err := dockerClient.ImagePull(ctx, img, types.ImagePullOptions{})
			if err != nil {
				log.Printf("Failed to pull image %s: %v", img, err)
				continue
			}
			// Drain reader
			io.Copy(io.Discard, reader)
			reader.Close()
			log.Printf("Successfully pulled image: %s", img)
		} else {
			log.Printf("Image already present: %s", img)
		}
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"service": "coding-service",
		"status":  "UP",
		"part":    "Part 3: Code Sandbox Execution Engine",
	})
}

func executeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ExecutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Timeout <= 0 {
		req.Timeout = 5000 // Default 5 seconds
	}

	resp := runInSandbox(req)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func runInSandbox(req ExecutionRequest) ExecutionResponse {
	var image string
	var cmd string

	encodedCode := base64.StdEncoding.EncodeToString([]byte(req.Code))
	encodedInput := base64.StdEncoding.EncodeToString([]byte(req.Input))

	switch req.Language {
	case "python", "python3":
		image = "python:3.10-alpine"
		cmd = "echo $SANNA_CODE | base64 -d > run.py && echo $SANNA_INPUT | base64 -d | python3 run.py"
	case "cpp", "c++":
		image = "gcc:12.2-alpine"
		cmd = "echo $SANNA_CODE | base64 -d > run.cpp && g++ -O3 run.cpp -o run && echo $SANNA_INPUT | base64 -d | ./run"
	case "java":
		image = "openjdk:17-alpine"
		cmd = "echo $SANNA_CODE | base64 -d > Main.java && javac Main.java && echo $SANNA_INPUT | base64 -d | java Main"
	default:
		return ExecutionResponse{
			Status: "RUNTIME_ERROR",
			Error:  fmt.Sprintf("Unsupported language: %s", req.Language),
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(req.Timeout+2000)*time.Millisecond)
	defer cancel()

	// Strict security limit properties
	pidsLimit := int64(50)
	config := &container.Config{
		Image:           image,
		Cmd:             []string{"sh", "-c", cmd},
		WorkingDir:      "/tmp",
		NetworkDisabled: true,
		Env: []string{
			"SANNA_CODE=" + encodedCode,
			"SANNA_INPUT=" + encodedInput,
		},
	}

	hostConfig := &container.HostConfig{
		Resources: container.Resources{
			Memory:    128 * 1024 * 1024,      // 128 MB RAM
			NanoCPUs:  500000000,             // 0.5 CPU cores
			PidsLimit: &pidsLimit,
		},
		ReadonlyRootfs: true,
		Tmpfs: map[string]string{
			"/tmp": "rw,exec,nosuid,size=65536k", // Writeable in-memory mount with exec permission
		},
	}

	// Create container
	resp, err := dockerClient.ContainerCreate(ctx, config, hostConfig, nil, nil, "")
	if err != nil {
		return ExecutionResponse{
			Status: "RUNTIME_ERROR",
			Error:  fmt.Sprintf("Failed to create container: %v", err),
		}
	}
	containerID := resp.ID
	defer func() {
		// Clean up container
		removeCtx := context.Background()
		dockerClient.ContainerRemove(removeCtx, containerID, types.ContainerRemoveOptions{Force: true})
	}()

	// Start container
	if err := dockerClient.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return ExecutionResponse{
			Status: "RUNTIME_ERROR",
			Error:  fmt.Sprintf("Failed to start container: %v", err),
		}
	}

	// Wait for container completion with timeout handler
	resultChan, errChan := dockerClient.ContainerWait(ctx, containerID, container.WaitConditionNotRunning)
	var waitErr error
	var waitResult container.ContainerWaitOKBody
	timedOut := false

	select {
	case waitResult = <-resultChan:
		// Completed normally
	case waitErr = <-errChan:
		// Err or ctx timeout
		if ctx.Err() != nil {
			timedOut = true
		}
	case <-time.After(time.Duration(req.Timeout) * time.Millisecond):
		timedOut = true
	}

	if timedOut {
		// Forcefully terminate container
		killCtx := context.Background()
		dockerClient.ContainerKill(killCtx, containerID, "SIGKILL")
		return ExecutionResponse{
			Status: "TIME_LIMIT_EXCEEDED",
			Error:  fmt.Sprintf("Execution timed out after %dms", req.Timeout),
		}
	}

	if waitErr != nil {
		return ExecutionResponse{
			Status: "RUNTIME_ERROR",
			Error:  fmt.Sprintf("Container execution error: %v", waitErr),
		}
	}

	// Read execution logs
	logOptions := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
	}
	logsReader, err := dockerClient.ContainerLogs(ctx, containerID, logOptions)
	if err != nil {
		return ExecutionResponse{
			Status: "RUNTIME_ERROR",
			Error:  fmt.Sprintf("Failed to get logs: %v", err),
		}
	}
	defer logsReader.Close()

	var stdoutBuf, stderrBuf bytes.Buffer
	_, err = stdcopy.StdCopy(&stdoutBuf, &stderrBuf, logsReader)
	if err != nil {
		return ExecutionResponse{
			Status: "RUNTIME_ERROR",
			Error:  fmt.Sprintf("Failed to read log stream: %v", err),
		}
	}

	stderrStr := stderrBuf.String()
	stdoutStr := stdoutBuf.String()

	status := "PASSED"
	if waitResult.StatusCode != 0 {
		status = "RUNTIME_ERROR"
		// If compiler outputs error, it could also be compilation error
		if req.Language == "cpp" || req.Language == "java" {
			status = "COMPILE_ERROR"
		}
	}

	return ExecutionResponse{
		Status: status,
		Output: stdoutStr,
		Error:  stderrStr,
	}
}

func main() {
	initDockerClient()

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/v1/sandbox/execute", executeHandler)

	port := ":4003"
	fmt.Printf("[Part 3] Go Code Sandbox Execution Service running on port %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
