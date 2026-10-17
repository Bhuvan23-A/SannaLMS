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
	"strings"
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
	Status     string `json:"status"` // "PASSED", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "COMPILE_ERROR", "RUNTIME_ERROR"
	Output     string `json:"output"`
	Error      string `json:"error"`
	DurationMs int64  `json:"durationMs"`
}

type TestCase struct {
	ID             string  `json:"id"`
	Input          string  `json:"input"`
	ExpectedOutput string  `json:"expectedOutput"`
	IsHidden       bool    `json:"isHidden"`
	Weight         float64 `json:"weight"`
}

type TestCaseResult struct {
	ID             string  `json:"id"`
	Passed         bool    `json:"passed"`
	Status         string  `json:"status"`
	ActualOutput   string  `json:"actualOutput"`
	ExpectedOutput string  `json:"expectedOutput"`
	Error          string  `json:"error"`
	IsHidden       bool    `json:"isHidden"`
	DurationMs     int64   `json:"durationMs"`
	Weight         float64 `json:"weight"`
}

type TestCasesRequest struct {
	Language  string     `json:"language"`
	Code      string     `json:"code"`
	TestCases []TestCase `json:"testCases"`
	Timeout   int        `json:"timeout"`
}

type TestCasesResponse struct {
	TotalCases      int              `json:"totalCases"`
	PassedCases     int              `json:"passedCases"`
	Score           float64          `json:"score"`
	MaxScore        float64          `json:"maxScore"`
	Percentage      float64          `json:"percentage"`
	OverallStatus   string           `json:"overallStatus"`
	TotalDurationMs int64            `json:"totalDurationMs"`
	Results         []TestCaseResult `json:"results"`
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
		"gcc:13",
		"eclipse-temurin:17-alpine",
		"node:20-alpine",
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
			io.Copy(io.Discard, reader)
			reader.Close()
			log.Printf("Successfully pulled image: %s", img)
		} else {
			log.Printf("Image already present: %s", img)
		}
	}
}

func ensureImage(image string) error {
	ctx := context.Background()
	if _, _, err := dockerClient.ImageInspectWithRaw(ctx, image); err == nil {
		return nil
	}
	log.Printf("[ensureImage] pulling missing image: %s", image)
	pullCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	reader, err := dockerClient.ImagePull(pullCtx, image, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image %s: %w", image, err)
	}
	defer reader.Close()
	if _, err := io.Copy(io.Discard, reader); err != nil {
		return fmt.Errorf("failed to read pull stream for %s: %w", image, err)
	}
	log.Printf("[ensureImage] pulled %s", image)
	return nil
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"service": "coding-service",
		"status":  "UP",
		"platform": "Edulateral CodeLab Execution Engine",
		"version": "1.0-mvp",
		"languages": "python, c, cpp, java, javascript, sql",
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

func testCasesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TestCasesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Timeout <= 0 {
		req.Timeout = 5000
	}

	overallStart := time.Now()
	var results []TestCaseResult
	passedCount := 0
	totalScore := 0.0
	maxScore := 0.0
	hasRuntimeErr := false
	hasTimeLimitErr := false

	for i, tc := range req.TestCases {
		weight := tc.Weight
		if weight <= 0 {
			weight = 1.0
		}
		maxScore += weight

		execReq := ExecutionRequest{
			Language: req.Language,
			Code:     req.Code,
			Input:    tc.Input,
			Timeout:  req.Timeout,
		}

		execResp := runInSandbox(execReq)

		actualTrimmed := strings.TrimSpace(execResp.Output)
		expectedTrimmed := strings.TrimSpace(tc.ExpectedOutput)

		passed := (execResp.Status == "PASSED" && actualTrimmed == expectedTrimmed)
		status := execResp.Status
		if execResp.Status == "PASSED" && !passed {
			status = "WRONG_ANSWER"
		}

		if status == "RUNTIME_ERROR" || status == "COMPILE_ERROR" {
			hasRuntimeErr = true
		} else if status == "TIME_LIMIT_EXCEEDED" {
			hasTimeLimitErr = true
		}

		tcID := tc.ID
		if tcID == "" {
			tcID = fmt.Sprintf("tc-%d", i+1)
		}

		actualOutputToReport := execResp.Output
		expectedOutputToReport := tc.ExpectedOutput
		if tc.IsHidden && !passed {
			actualOutputToReport = "[Hidden test case output protected]"
			expectedOutputToReport = "[Hidden test case]"
		}

		if passed {
			passedCount++
			totalScore += weight
		}

		results = append(results, TestCaseResult{
			ID:             tcID,
			Passed:         passed,
			Status:         status,
			ActualOutput:   actualOutputToReport,
			ExpectedOutput: expectedOutputToReport,
			Error:          execResp.Error,
			IsHidden:       tc.IsHidden,
			DurationMs:     execResp.DurationMs,
			Weight:         weight,
		})
	}

	overallStatus := "PASSED"
	if passedCount < len(req.TestCases) {
		if hasTimeLimitErr {
			overallStatus = "TIME_LIMIT_EXCEEDED"
		} else if hasRuntimeErr {
			overallStatus = "RUNTIME_ERROR"
		} else {
			overallStatus = "WRONG_ANSWER"
		}
	}

	percentage := 0.0
	if maxScore > 0 {
		percentage = (totalScore / maxScore) * 100.0
	}

	response := TestCasesResponse{
		TotalCases:      len(req.TestCases),
		PassedCases:     passedCount,
		Score:           totalScore,
		MaxScore:        maxScore,
		Percentage:      percentage,
		OverallStatus:   overallStatus,
		TotalDurationMs: time.Since(overallStart).Milliseconds(),
		Results:         results,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func runInSandbox(req ExecutionRequest) ExecutionResponse {
	startExec := time.Now()
	var image string
	var cmd string

	encodedCode := base64.StdEncoding.EncodeToString([]byte(req.Code))
	encodedInput := base64.StdEncoding.EncodeToString([]byte(req.Input))

	lang := strings.ToLower(strings.TrimSpace(req.Language))
	switch lang {
	case "python", "python3":
		image = "python:3.10-alpine"
		cmd = "echo $SANNA_CODE | base64 -d > run.py && echo $SANNA_INPUT | base64 -d | python3 run.py"
	case "c":
		image = "gcc:13"
		cmd = "echo $SANNA_CODE | base64 -d > run.c && gcc -O2 run.c -o run && echo $SANNA_INPUT | base64 -d | ./run"
	case "cpp", "c++":
		image = "gcc:13"
		cmd = "echo $SANNA_CODE | base64 -d > run.cpp && g++ -O2 run.cpp -o run && echo $SANNA_INPUT | base64 -d | ./run"
	case "java":
		image = "eclipse-temurin:17-alpine"
		cmd = "echo $SANNA_CODE | base64 -d > Main.java && javac Main.java && echo $SANNA_INPUT | base64 -d | java -Xmx64m Main"
	case "javascript", "js", "nodejs":
		image = "node:20-alpine"
		cmd = "echo $SANNA_CODE | base64 -d > run.js && echo $SANNA_INPUT | base64 -d | node run.js"
	case "sql":
		image = "python:3.10-alpine"
		// In-memory SQLite execution container with DDL/DML setup schema + query execution
		cmd = "echo $SANNA_CODE | base64 -d > query.sql && echo $SANNA_INPUT | base64 -d > schema.sql && python3 -c \"import sqlite3, sys\nconn = sqlite3.connect(':memory:')\ncur = conn.cursor()\nwith open('schema.sql') as f:\n    s = f.read().strip()\n    if s: cur.executescript(s)\nwith open('query.sql') as f:\n    q = f.read().strip()\n    if q:\n        for stmt in q.split(';'):\n            stmt = stmt.strip()\n            if not stmt: continue\n            cur.execute(stmt)\n            if cur.description:\n                cols = [d[0] for d in cur.description]\n                print(' | '.join(cols))\n                print('-' * max(len(' | '.join(cols)), 10))\n                for row in cur.fetchall():\n                    print(' | '.join(str(v) for v in row))\n\""
	default:
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Unsupported language: %s", req.Language),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}

	effectiveTimeout := req.Timeout
	switch lang {
	case "cpp", "c++", "c", "java":
		if effectiveTimeout < 15000 {
			effectiveTimeout = 15000
		}
	default:
		if effectiveTimeout < 6000 {
			effectiveTimeout = 6000
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(effectiveTimeout+3000)*time.Millisecond)
	defer cancel()

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
			Memory:    128 * 1024 * 1024, // 128 MB RAM
			NanoCPUs:  500000000,        // 0.5 CPU cores
			PidsLimit: &pidsLimit,
		},
		ReadonlyRootfs: true,
		Tmpfs: map[string]string{
			"/tmp": "rw,exec,nosuid,size=65536k",
		},
	}

	if err := ensureImage(image); err != nil {
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Failed to prepare runtime image: %v", err),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}
	resp, err := dockerClient.ContainerCreate(ctx, config, hostConfig, nil, nil, "")
	if err != nil {
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Failed to create container: %v", err),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}
	containerID := resp.ID
	defer func() {
		removeCtx := context.Background()
		dockerClient.ContainerRemove(removeCtx, containerID, types.ContainerRemoveOptions{Force: true})
	}()

	if err := dockerClient.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Failed to start container: %v", err),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}

	resultChan, errChan := dockerClient.ContainerWait(ctx, containerID, container.WaitConditionNotRunning)
	var waitErr error
	var statusCode int64 = -1
	timedOut := false

	select {
	case waitResult := <-resultChan:
		statusCode = waitResult.StatusCode
	case waitErr = <-errChan:
		if ctx.Err() != nil {
			timedOut = true
		}
	case <-time.After(time.Duration(effectiveTimeout) * time.Millisecond):
		timedOut = true
	}

	if timedOut {
		killCtx := context.Background()
		dockerClient.ContainerKill(killCtx, containerID, "SIGKILL")
		return ExecutionResponse{
			Status:     "TIME_LIMIT_EXCEEDED",
			Error:      fmt.Sprintf("Execution timed out after %dms", req.Timeout),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}

	if waitErr != nil {
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Container execution error: %v", waitErr),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}

	logOptions := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
	}
	logsReader, err := dockerClient.ContainerLogs(ctx, containerID, logOptions)
	if err != nil {
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Failed to get logs: %v", err),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}
	defer logsReader.Close()

	var stdoutBuf, stderrBuf bytes.Buffer
	_, err = stdcopy.StdCopy(&stdoutBuf, &stderrBuf, logsReader)
	if err != nil {
		return ExecutionResponse{
			Status:     "RUNTIME_ERROR",
			Error:      fmt.Sprintf("Failed to read log stream: %v", err),
			DurationMs: time.Since(startExec).Milliseconds(),
		}
	}

	stderrStr := stderrBuf.String()
	stdoutStr := stdoutBuf.String()

	status := "PASSED"
	if statusCode != 0 {
		status = "RUNTIME_ERROR"
		if lang == "cpp" || lang == "c++" || lang == "c" || lang == "java" {
			status = "COMPILE_ERROR"
		}
	}

	return ExecutionResponse{
		Status:     status,
		Output:     stdoutStr,
		Error:      stderrStr,
		DurationMs: time.Since(startExec).Milliseconds(),
	}
}

func main() {
	initDockerClient()

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/v1/sandbox/execute", executeHandler)
	http.HandleFunc("/execute", executeHandler)
	http.HandleFunc("/api/v1/sandbox/testcases", testCasesHandler)
	http.HandleFunc("/testcases", testCasesHandler)

	port := ":4003"
	fmt.Printf("[Part 3] Edulateral CodeLab Go Sandbox Service running on port %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

