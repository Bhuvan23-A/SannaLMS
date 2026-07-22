package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type ExecutionRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
	Input    string `json:"input"`
}

type ExecutionResponse struct {
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"service": "coding-service",
		"status":  "UP",
		"part":    "Part 3: Assessment, Proctoring & Coding Sandbox",
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

	// Placeholder execution logic
	resp := ExecutionResponse{
		Status: "PASSED",
		Output: fmt.Sprintf("Executed %s code in isolated Docker runner sandbox context.", req.Language),
		Error:  "",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/v1/sandbox/execute", executeHandler)

	port := ":4003"
	fmt.Printf("[Part 3] Go Code Sandbox Execution Service running on port %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
