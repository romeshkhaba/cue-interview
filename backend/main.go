package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	openai "github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

type sseEvent map[string]any

type introRequest struct {
	UserName   string         `json:"userName"`
	ResumeName string         `json:"resumeName"`
	ResumeText string         `json:"resumeText"`
	Parsed     map[string]any `json:"parsed"`
}

func main() {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = loadAPIKeyFromEnvFile(".env", "../.env")
	}
	if apiKey == "" {
		log.Fatal("OPENAI_API_KEY not set — set it as an env var or in ../.env")
	}

	c := openai.NewClient(option.WithAPIKey(apiKey))
	client := &c

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS — allows the Vite dev server (port 5173) to talk to this backend
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	})

	r.POST("/api/answer", func(c *gin.Context) {
		handleAnswer(c, client)
	})
	r.POST("/api/intro", func(c *gin.Context) {
		handleIntro(c, client)
	})
	r.POST("/api/code", func(c *gin.Context) {
		handleCode(c, client)
	})

	// Serve built frontend — run `npm run build` in ../frontend first
	staticDir := "../frontend/dist"
	r.Static("/assets", filepath.Join(staticDir, "assets"))
	r.NoRoute(func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "index.html"))
	})

	log.Println("Listening on http://localhost:8080")
	r.Run(":8080")
}

func loadAPIKeyFromEnvFile(paths ...string) string {
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(data), "\n") {
			if after, ok := strings.CutPrefix(line, "OPENAI_API_KEY="); ok {
				return strings.Trim(strings.TrimSpace(after), `"'`)
			}
		}
	}
	return ""
}

func handleIntro(c *gin.Context, client *openai.Client) {
	var req introRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid intro request"})
		return
	}

	req.ResumeText = strings.TrimSpace(req.ResumeText)
	req.ResumeName = strings.TrimSpace(req.ResumeName)
	req.UserName = strings.TrimSpace(req.UserName)
	if req.ResumeText == "" && len(req.Parsed) == 0 && req.ResumeName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing resume content"})
		return
	}
	if len(req.ResumeText) > 20000 {
		req.ResumeText = req.ResumeText[:20000]
	}

	parsedJSON, _ := json.Marshal(req.Parsed)
	prompt := `Create a polished spoken interview introduction from this resume.

Return only the introduction text. Do not use markdown, bullets, headings, JSON, or quotation marks.

Requirements:
- Write in first person.
- Keep it natural and confident for a "Tell me about yourself" interview answer.
- Aim for 60-90 seconds spoken aloud.
- Mention the candidate's likely role, strongest skills, relevant experience, and impact.
- End with a concise reason they are excited about the role.

Candidate name: ` + req.UserName + `
Resume file: ` + req.ResumeName + `
Parsed resume hints: ` + string(parsedJSON) + `
Resume text:
` + req.ResumeText

	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.String(http.StatusInternalServerError, "streaming unsupported")
		return
	}

	stream := client.Chat.Completions.NewStreaming(c.Request.Context(), openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4o,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("You are an expert interview coach who writes concise, specific, spoken interview introductions."),
			openai.UserMessage(prompt),
		},
		MaxTokens: openai.Int(450),
	})

	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) == 0 {
			continue
		}
		content := chunk.Choices[0].Delta.Content
		if content == "" {
			continue
		}
		if _, err := c.Writer.Write([]byte(content)); err != nil {
			return
		}
		flusher.Flush()
	}

	if err := stream.Err(); err != nil {
		log.Printf("intro stream error: %v", err)
		return
	}
}

func writeSSE(w http.ResponseWriter, f http.Flusher, v any) {
	data, _ := json.Marshal(v)
	fmt.Fprintf(w, "data: %s\n\n", data)
	f.Flush()
}

func handleAnswer(c *gin.Context, client *openai.Client) {
	ctx := c.Request.Context()

	fileHeader, err := c.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing audio field"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open upload"})
		return
	}
	defer src.Close()

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == "" {
		ext = ".webm"
	}
	tmp, err := os.CreateTemp("", "audio-*"+ext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create temp file"})
		return
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()

	if _, err := io.Copy(tmp, src); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save audio"})
		return
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "seek failed"})
		return
	}

	role := strings.TrimSpace(c.PostForm("role"))

	var history []historyEntry
	if h := c.PostForm("history"); h != "" {
		_ = json.Unmarshal([]byte(h), &history)
		if len(history) > 5 {
			history = history[len(history)-5:]
		}
	}

	// Step 1: Whisper transcription
	// The Prompt field primes Whisper with role-specific vocabulary so technical
	// terms and unclear speech are resolved toward the right domain words.
	whisperPrompt := buildWhisperPrompt(role)
	transcriptionParams := openai.AudioTranscriptionNewParams{
		File:     tmp,
		Model:    openai.AudioModelWhisper1,
		Language: openai.String("en"),
	}
	if whisperPrompt != "" {
		transcriptionParams.Prompt = openai.String(whisperPrompt)
	}
	transcription, err := client.Audio.Transcriptions.New(ctx, transcriptionParams)
	if err != nil {
		log.Printf("transcription error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "transcription failed"})
		return
	}

	question := strings.TrimSpace(transcription.Text)
	if question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no speech detected"})
		return
	}
	log.Printf("Role: %q  Question: %s", role, question)

	// Switch to SSE now that we have the question
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.String(http.StatusInternalServerError, "streaming unsupported")
		return
	}

	// Emit question immediately — frontend can render it while GPT thinks
	writeSSE(c.Writer, flusher, sseEvent{"type": "question", "text": question})

	// Step 2: GPT-4o streaming answer.
	//
	// Output format:
	//   SHORT_START
	//   <short answer — streamed token by token>
	//   SHORT_END
	//   POINT: <point>   (repeated 3-5×)
	//   CODE_LANG: <lang>
	//   CODE_FILE: <filename>
	//   CODE_START
	//   <code>
	//   CODE_END
	systemPrompt := buildAnswerSystemPrompt(role)
	messages := []openai.ChatCompletionMessageParamUnion{openai.SystemMessage(systemPrompt)}
	for _, h := range history {
		messages = append(messages,
			openai.UserMessage(h.Question),
			openai.AssistantMessage(h.Answer),
		)
	}
	messages = append(messages, openai.UserMessage(question))

	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Model:     openai.ChatModelGPT4o,
		Messages:  messages,
		MaxTokens: openai.Int(900),
	})

	// State machine: normal → short (streams tokens live) → normal → code (buffered)
	const shortEndMarker = "\nSHORT_END"
	const shortLookahead = len(shortEndMarker) + 1

	type state int
	const (
		psNormal state = iota
		psShort
		psCode
	)

	cur := psNormal
	var buf strings.Builder  // line buffer (normal/code)
	var sBuf strings.Builder // short section lookahead buffer
	var codeBuf strings.Builder
	var codeLang, codeFile string

	// processLine handles one complete line while in psNormal or psCode
	var processLine func(line string)
	processLine = func(line string) {
		line = strings.TrimRight(line, "\r")
		switch cur {
		case psNormal:
			switch {
			case line == "SHORT_START":
				cur = psShort
				sBuf.Reset()
			case strings.HasPrefix(line, "POINT: "):
				writeSSE(c.Writer, flusher, sseEvent{"type": "point", "text": strings.TrimPrefix(line, "POINT: ")})
			case strings.HasPrefix(line, "APPROACH: "):
				writeSSE(c.Writer, flusher, sseEvent{"type": "approach", "text": strings.TrimPrefix(line, "APPROACH: ")})
			case strings.HasPrefix(line, "CODE_LANG: "):
				codeLang = strings.TrimPrefix(line, "CODE_LANG: ")
			case strings.HasPrefix(line, "CODE_FILE: "):
				codeFile = strings.TrimPrefix(line, "CODE_FILE: ")
			case line == "CODE_START":
				cur = psCode
				codeBuf.Reset()
			}
		case psCode:
			if line == "CODE_END" {
				writeSSE(c.Writer, flusher, sseEvent{"type": "code", "lang": codeLang, "file": codeFile, "text": strings.TrimRight(codeBuf.String(), "\n")})
				cur = psNormal
			} else {
				codeBuf.WriteString(line + "\n")
			}
		}
	}

	// feedNormal drains complete lines from buf while in psNormal or psCode
	feedNormal := func() {
		for {
			s := buf.String()
			idx := strings.Index(s, "\n")
			if idx < 0 {
				break
			}
			line := s[:idx]
			buf.Reset()
			buf.WriteString(s[idx+1:])
			processLine(line)
			if cur == psShort {
				// SHORT_START was just processed; remaining buf content feeds into short mode
				sBuf.WriteString(buf.String())
				buf.Reset()
				break
			}
		}
	}

	// feedShort handles a new token while in psShort.
	// Streams content live while keeping a small lookahead to detect SHORT_END.
	feedShort := func(token string) {
		sBuf.WriteString(token)
		content := sBuf.String()

		if endIdx := strings.Index(content, shortEndMarker); endIdx >= 0 {
			// Found the end marker — emit whatever precedes it, then close
			before := content[:endIdx]
			if before != "" {
				writeSSE(c.Writer, flusher, sseEvent{"type": "short_delta", "text": before})
			}
			writeSSE(c.Writer, flusher, sseEvent{"type": "short_done"})
			cur = psNormal
			sBuf.Reset()
			// Remainder after SHORT_END feeds back into normal line processing
			rest := content[endIdx+len(shortEndMarker):]
			if strings.HasPrefix(rest, "\n") {
				rest = rest[1:]
			}
			buf.WriteString(rest)
			feedNormal()
			return
		}

		// No end marker yet — safely emit everything except the lookahead window
		if safeLen := len(content) - shortLookahead; safeLen > 0 {
			writeSSE(c.Writer, flusher, sseEvent{"type": "short_delta", "text": content[:safeLen]})
			sBuf.Reset()
			sBuf.WriteString(content[safeLen:])
		}
	}

	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) == 0 {
			continue
		}
		token := chunk.Choices[0].Delta.Content
		if token == "" {
			continue
		}

		if cur == psShort {
			feedShort(token)
		} else {
			buf.WriteString(token)
			feedNormal()
		}
	}

	// Flush anything remaining at end of stream
	if cur == psShort {
		if tail := strings.TrimRight(sBuf.String(), "\r\n"); tail != "" {
			writeSSE(c.Writer, flusher, sseEvent{"type": "short_delta", "text": tail})
		}
		writeSSE(c.Writer, flusher, sseEvent{"type": "short_done"})
	} else if tail := strings.TrimSpace(buf.String()); tail != "" {
		processLine(tail)
	}

	if err := stream.Err(); err != nil {
		log.Printf("answer stream error: %v", err)
		writeSSE(c.Writer, flusher, sseEvent{"type": "error", "message": "answer generation failed"})
		return
	}

	writeSSE(c.Writer, flusher, sseEvent{"type": "done"})
}

// buildWhisperPrompt returns a vocabulary hint string for Whisper so it
// resolves ambiguous or mumbled speech toward the correct technical domain.
// Whisper treats the prompt as a prior transcript segment, so we write it as
// natural spoken text seeded with domain vocabulary.
func buildWhisperPrompt(role string) string {
	base := "This is a technical job interview."
	if role == "" {
		return base + " The candidate is answering software engineering questions about algorithms, data structures, system design, APIs, databases, and programming languages."
	}
	return base + " The role being interviewed for is: " + role + "." +
		" The candidate is answering questions relevant to that role — expect technical terminology, domain-specific frameworks, methodologies, and jargon associated with " + role + " positions."
}

// buildAnswerSystemPrompt builds the GPT system prompt, injecting the role so
// answers are tailored to what an interviewer for that position expects.
func buildAnswerSystemPrompt(role string) string {
	roleContext := ""
	if role != "" {
		roleContext = "\nThe candidate is interviewing for the role: " + role + "." +
			" Tailor the answer, talking points, and any code examples to what an interviewer for that specific role would value most.\n"
	}
	return `You are an expert interview coach.` + roleContext + ` Answer interview questions using EXACTLY this format — no markdown, no extra text, no code fences:

SHORT_START
<1-2 sentence direct answer here>
SHORT_END
POINT: <talking point 1>
POINT: <talking point 2>
POINT: <talking point 3>
CODE_LANG: <language>
CODE_FILE: <filename>
CODE_START
<working code solution here>
CODE_END
APPROACH: <step-by-step explanation line 1>
APPROACH: <step-by-step explanation line 2>
APPROACH: <step-by-step explanation line 3>

Rules:
- The short answer between SHORT_START and SHORT_END must be 1-2 confident sentences
- Include 3-5 POINT lines with specific, actionable talking points
- Include CODE_LANG / CODE_FILE / CODE_START / CODE_END / APPROACH when:
  * The question explicitly asks for code, an example, or a demonstration ("give me", "show me", "write", "implement", "example of")
  * The question asks to implement, write, or fix something
  * The question is about an algorithm or data structure
  * The question itself contains code (always provide a corrected, improved, or explained version)
- When code is included, always add 3-5 APPROACH lines after CODE_END explaining the logic step by step
- Omit all code and APPROACH sections entirely for conceptual, behavioural, or system-design questions that contain no code and do not ask for an example`
}

type codeRequest struct {
	Question string `json:"question"`
	Role     string `json:"role"`
}

type historyEntry struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

func handleCode(c *gin.Context, client *openai.Client) {
	var req codeRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Question) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing question"})
		return
	}

	role := strings.TrimSpace(req.Role)
	roleCtx := ""
	if role != "" {
		roleCtx = " The candidate is interviewing for the role: " + role + "." +
			" Use the primary programming language associated with that role for the code solution."
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.String(http.StatusInternalServerError, "streaming unsupported")
		return
	}

	// GPT outputs exactly two metadata lines then raw code — no closing delimiter
	// needed, so the stream can never "miss" a CODE_END marker.
	//
	//   LANG: python
	//   FILE: solution.py
	//   <code streams from here to end of response>
	stream := client.Chat.Completions.NewStreaming(c.Request.Context(), openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4o,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(`You are an expert interview coach.` + roleCtx + `
Given an interview question, output EXACTLY the following — no markdown, no code fences, no extra text:

LANG: <language>
FILE: <filename>
<complete, well-commented working solution starting on this line>

Rules:
- First line must be LANG: <language>
- Second line must be FILE: <filename>
- From the third line onward write only the code — nothing else
- Use the primary language of the candidate's role (e.g. Go for a Golang Backend role, TypeScript for a Frontend role, Java for an Android role). If no role is given, default to Python
- Write clean, production-quality code with brief inline comments
- Add a short example usage or test at the very bottom as a comment`),
			openai.UserMessage(req.Question),
		},
		MaxTokens: openai.Int(700),
	})

	// Header scan: look for LANG: and FILE: in the first maxHeaderLines lines.
	// We don't assume they are exactly line 1 and 2 — GPT sometimes emits a blank
	// line or short preamble. After maxHeaderLines we give up and stream everything.
	const maxHeaderLines = 8
	codeLang := "python"
	codeFile := "solution.py"
	sawLang := false
	sawFile := false
	headerDone := false
	scannedLines := 0
	var lineBuf strings.Builder

	switchToStream := func(remaining string) {
		headerDone = true
		writeSSE(c.Writer, flusher, sseEvent{"type": "meta", "lang": codeLang, "file": codeFile})
		if remaining != "" {
			writeSSE(c.Writer, flusher, sseEvent{"type": "delta", "text": remaining})
		}
	}

	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) == 0 {
			continue
		}
		token := chunk.Choices[0].Delta.Content
		if token == "" {
			continue
		}

		if headerDone {
			writeSSE(c.Writer, flusher, sseEvent{"type": "delta", "text": token})
			continue
		}

		lineBuf.WriteString(token)
		full := lineBuf.String()
		for !headerDone {
			idx := strings.Index(full, "\n")
			if idx < 0 {
				break
			}
			line := strings.TrimRight(full[:idx], "\r")
			full = full[idx+1:]
			scannedLines++

			if after, ok := strings.CutPrefix(line, "LANG:"); ok {
				codeLang = strings.TrimSpace(after)
				sawLang = true
			} else if after, ok := strings.CutPrefix(line, "FILE:"); ok {
				codeFile = strings.TrimSpace(after)
				sawFile = true
			}

			if (sawLang && sawFile) || scannedLines >= maxHeaderLines {
				switchToStream(full)
				full = ""
			}
		}
		lineBuf.Reset()
		lineBuf.WriteString(full)
	}

	if !headerDone {
		switchToStream(lineBuf.String())
	}

	if err := stream.Err(); err != nil {
		log.Printf("code stream error: %v", err)
		writeSSE(c.Writer, flusher, sseEvent{"type": "error", "message": "code generation failed"})
		return
	}

	writeSSE(c.Writer, flusher, sseEvent{"type": "done"})
}
