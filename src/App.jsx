import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-20250514'
const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
  // Find first { or [ and last } or ]
  const start = cleaned.search(/[{[]/)
  const end   = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (start === -1 || end === -1) throw new Error('No JSON found')
  return JSON.parse(cleaned.slice(start, end + 1))
}

async function extractPdfText(file, onProgress) {
  const pdfjsLib = window['pdfjs-dist/build/pdf']
  if (!pdfjsLib) throw new Error('PDF.js not loaded')
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER

  const arrayBuffer = await file.arrayBuffer()
  const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text   = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
    if (onProgress) onProgress(i, pdf.numPages)
  }
  return text
}

async function callClaude(system, userMessage) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            '',
      'anthropic-version':    '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content[0].text
}

// ─── Icon Components ──────────────────────────────────────────────────────────

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path strokeLinecap="round" d="M12 2a10 10 0 0110 10" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

// ─── InputPanel ───────────────────────────────────────────────────────────────

function InputPanel({ onSubmit, loading }) {
  const [inputMode, setInputMode] = useState('text')
  const [inputText, setInputText] = useState('')
  const [pdfFiles, setPdfFiles]   = useState([])
  const [dragOver, setDragOver]   = useState(false)
  const fileRef  = useRef(null)
  const multiRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (!files.length) return
    if (inputMode === 'pdf') setPdfFiles([files[0]])
    else setPdfFiles(prev => [...prev, ...files])
  }, [inputMode])

  const handleFileChange = (e, multi) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    if (multi) setPdfFiles(prev => [...prev, ...files])
    else setPdfFiles([files[0]])
    e.target.value = ''
  }

  const removeFile = (idx) => setPdfFiles(prev => prev.filter((_, i) => i !== idx))

  const canSubmit = () => {
    if (inputMode === 'text') return inputText.trim().length > 50
    return pdfFiles.length > 0
  }

  const handleSubmit = () => {
    if (!canSubmit()) return
    if (inputMode === 'text') onSubmit({ mode: 'text', text: inputText })
    else onSubmit({ mode: 'pdf', files: pdfFiles })
  }

  const tabs = [
    { id: 'text',       label: 'Paste Text' },
    { id: 'pdf',        label: 'Single PDF' },
    { id: 'multi-pdf',  label: 'Multiple PDFs' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 font-body">
      {/* Header */}
      <div className="text-center mb-10 animate-slideUp">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
            <IconBook />
          </div>
          <h1 className="font-display text-4xl text-gold tracking-tight">StudyForge</h1>
        </div>
        <p className="text-parchment-dim text-sm tracking-widest uppercase">
          Two-Agent AI Study Tool
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl gold-border rounded-2xl bg-navy-2 gold-glow animate-slideUp p-8" style={{ animationDelay: '0.1s' }}>
        {/* Tabs */}
        <div className="flex gap-1 bg-navy rounded-xl p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setInputMode(tab.id); setPdfFiles([]) }}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg transition-all duration-200 ${
                inputMode === tab.id
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'text-parchment-dim hover:text-parchment'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Paste Text */}
        {inputMode === 'text' && (
          <div className="animate-fadeIn">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste your text, article, or study material here…"
              rows={10}
              className="w-full bg-navy rounded-xl p-4 text-sm text-parchment placeholder-parchment-dim/50 gold-border resize-none focus:outline-none focus:border-gold/50 transition-colors leading-relaxed"
            />
            <p className="text-xs text-parchment-dim mt-2">{inputText.length} characters</p>
          </div>
        )}

        {/* Single PDF */}
        {inputMode === 'pdf' && (
          <div
            className={`animate-fadeIn border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer ${
              dragOver ? 'border-gold bg-gold/5' : 'border-gold/25 hover:border-gold/50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFileChange(e, false)} />
            {pdfFiles.length > 0 ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center text-gold">
                  <IconBook />
                </div>
                <div className="text-left">
                  <p className="text-parchment text-sm font-medium">{pdfFiles[0].name}</p>
                  <p className="text-parchment-dim text-xs">{(pdfFiles[0].size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setPdfFiles([]) }}
                  className="ml-4 p-1.5 rounded-lg hover:bg-white/10 text-parchment-dim hover:text-parchment transition-colors"
                >
                  <IconTrash />
                </button>
              </div>
            ) : (
              <>
                <div className="text-gold/40 flex justify-center mb-3"><IconUpload /></div>
                <p className="text-parchment text-sm mb-1">Drop your PDF here</p>
                <p className="text-parchment-dim text-xs">or click to browse</p>
              </>
            )}
          </div>
        )}

        {/* Multiple PDFs */}
        {inputMode === 'multi-pdf' && (
          <div className="animate-fadeIn">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer mb-4 ${
                dragOver ? 'border-gold bg-gold/5' : 'border-gold/25 hover:border-gold/50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => multiRef.current?.click()}
            >
              <input ref={multiRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => handleFileChange(e, true)} />
              <div className="text-gold/40 flex justify-center mb-2"><IconUpload /></div>
              <p className="text-parchment text-sm mb-1">Drop PDFs here or click to browse</p>
              <p className="text-parchment-dim text-xs">All PDFs will be merged and analyzed together</p>
            </div>
            {pdfFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pdfFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-navy rounded-lg px-3 py-2 gold-border">
                    <div className="w-6 h-6 rounded bg-gold/20 flex items-center justify-center text-gold text-xs font-display font-bold">{i+1}</div>
                    <span className="text-parchment text-xs flex-1 truncate">{f.name}</span>
                    <span className="text-parchment-dim text-xs">{(f.size/1024).toFixed(0)}KB</span>
                    <button onClick={() => removeFile(i)} className="text-parchment-dim hover:text-parchment transition-colors">
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit() || loading}
          className={`mt-6 w-full py-3.5 rounded-xl font-medium text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
            canSubmit() && !loading
              ? 'bg-gold text-navy hover:bg-gold-lt cursor-pointer gold-glow'
              : 'bg-gold/20 text-gold/40 cursor-not-allowed'
          }`}
        >
          {loading ? <><IconSpinner /> Processing…</> : <>Analyze Book</>}
        </button>
      </div>

      {/* Footer hint */}
      <p className="mt-6 text-parchment-dim text-xs text-center animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        Agent 1 reads & structures · Agent 2 builds interactive slides
      </p>
    </div>
  )
}

// ─── LoadingOverlay ───────────────────────────────────────────────────────────

function LoadingOverlay({ phase, detail, agent2Progress }) {
  const phases = [
    { id: 'extracting', label: 'Extracting text…',       icon: '📄' },
    { id: 'agent1',     label: 'Agent 1 reading…',       icon: '🔍' },
    { id: 'agent2',     label: 'Agent 2 building slides…',icon: '🎨' },
  ]

  const currentIdx = phases.findIndex(p => p.id === phase)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 font-body">
      <div className="text-center max-w-md w-full animate-fadeIn">
        {/* Animated orb */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-gold/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 rounded-full border border-gold/40 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-4 rounded-full bg-gold/10 border border-gold/60 flex items-center justify-center text-2xl">
            {phases[currentIdx]?.icon ?? '⚙️'}
          </div>
        </div>

        {/* Phase label */}
        <h2 className="font-display text-2xl text-gold mb-2">
          {phases[currentIdx]?.label ?? 'Processing…'}
        </h2>
        {detail && <p className="text-parchment-dim text-sm mb-6">{detail}</p>}

        {/* Phase stepper */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {phases.map((p, i) => (
            <React.Fragment key={p.id}>
              <div className={`flex items-center gap-1.5 transition-all duration-300 ${
                i < currentIdx  ? 'text-gold' :
                i === currentIdx ? 'text-gold-lt' :
                'text-parchment-dim/30'
              }`}>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all duration-300 ${
                  i < currentIdx  ? 'bg-gold border-gold text-navy' :
                  i === currentIdx ? 'border-gold-lt' :
                  'border-current'
                }`}>
                  {i < currentIdx ? <IconCheck /> : i + 1}
                </div>
                <span className="text-xs hidden sm:inline">{p.label.replace('…', '')}</span>
              </div>
              {i < phases.length - 1 && (
                <div className={`w-8 h-px transition-all duration-500 ${i < currentIdx ? 'bg-gold' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Agent 2 chapter progress */}
        {phase === 'agent2' && agent2Progress && agent2Progress.total > 0 && (
          <div className="mt-8">
            <div className="flex justify-between text-xs text-parchment-dim mb-2">
              <span>Building chapters</span>
              <span>{agent2Progress.done} / {agent2Progress.total}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{ width: `${(agent2Progress.done / agent2Progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ chapters, selectedChapter, onSelect, slides }) {
  return (
    <aside className="w-64 shrink-0 flex flex-col bg-navy-2 border-r border-gold/15 overflow-y-auto font-body">
      {/* Logo */}
      <div className="p-5 border-b border-gold/15">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
            <IconBook />
          </div>
          <span className="font-display text-gold font-semibold text-lg">StudyForge</span>
        </div>
        <p className="text-xs text-parchment-dim mt-1.5">{chapters.length} chapters extracted</p>
      </div>

      {/* Chapter list */}
      <nav className="flex-1 p-3 space-y-1">
        {chapters.map((ch, i) => {
          const done    = !!slides[i]
          const active  = selectedChapter === i
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group ${
                active
                  ? 'bg-gold/15 border border-gold/35 text-parchment'
                  : 'hover:bg-white/5 text-parchment-dim hover:text-parchment'
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs border transition-all duration-200 ${
                  done
                    ? active ? 'bg-gold border-gold text-navy' : 'bg-gold/30 border-gold/50 text-gold'
                    : 'border-white/15 text-parchment-dim'
                }`}>
                  {done ? <IconCheck /> : i + 1}
                </div>
                <span className="text-xs leading-snug line-clamp-2 font-medium">{ch.title}</span>
              </div>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

// ─── TitleSlide ───────────────────────────────────────────────────────────────

function TitleSlide({ slide, chapterNum, totalChapters }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-12 animate-slideLeft">
      <p className="text-gold/60 text-xs tracking-widest uppercase mb-4 font-body">
        Chapter {chapterNum} of {totalChapters}
      </p>
      <h1 className="font-display text-4xl text-gold leading-tight mb-6">{slide.title}</h1>
      {slide.subtitle && (
        <p className="font-display italic text-parchment-dim text-lg mb-8">{slide.subtitle}</p>
      )}
      <div className="w-16 h-px bg-gold/40 mb-8" />
      <p className="text-parchment font-body text-base leading-relaxed max-w-lg">{slide.summary}</p>
    </div>
  )
}

// ─── ConceptSlide ─────────────────────────────────────────────────────────────

function ConceptSlide({ slide }) {
  return (
    <div className="flex flex-col h-full px-10 py-8 animate-slideLeft overflow-y-auto">
      <div className="mb-6">
        <p className="text-gold/60 text-xs tracking-widest uppercase mb-2 font-body">Key Concept</p>
        <h2 className="font-display text-3xl text-gold">{slide.conceptName}</h2>
        <div className="w-12 h-0.5 bg-gold/40 mt-3" />
      </div>
      <p className="text-parchment font-body text-sm leading-relaxed mb-8">{slide.explanation}</p>
      {slide.bullets && slide.bullets.length > 0 && (
        <ul className="space-y-3">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 animate-slideUp font-body" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              <span className="text-parchment text-sm leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── ModelSlide ───────────────────────────────────────────────────────────────

function ModelSlide({ slide }) {
  const components = slide.components || []
  return (
    <div className="flex flex-col h-full px-10 py-8 animate-slideLeft overflow-y-auto">
      <div className="mb-6">
        <p className="text-gold/60 text-xs tracking-widest uppercase mb-2 font-body">Framework / Model</p>
        <h2 className="font-display text-3xl text-gold">{slide.modelName}</h2>
        <div className="w-12 h-0.5 bg-gold/40 mt-3" />
      </div>
      {slide.description && (
        <p className="text-parchment font-body text-sm leading-relaxed mb-8">{slide.description}</p>
      )}
      {/* Infographic grid */}
      {components.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(components.length, 3)}, 1fr)` }}>
          {components.map((comp, i) => {
            const item = typeof comp === 'string' ? { label: comp, detail: '' } : comp
            return (
              <div
                key={i}
                className="relative bg-navy rounded-xl p-4 border border-gold/25 hover:border-gold/50 transition-all duration-200 animate-slideUp"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold text-xs font-display font-bold mb-3">
                  {i + 1}
                </div>
                <p className="text-parchment text-sm font-medium font-body mb-1">{item.label}</p>
                {item.detail && <p className="text-parchment-dim text-xs leading-relaxed font-body">{item.detail}</p>}
                {/* Connector arrow (right side, except last in row) */}
                {i % 3 < 2 && i < components.length - 1 && (
                  <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-gold/40 text-lg z-10">›</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── QuizSlide ────────────────────────────────────────────────────────────────

function QuizSlide({ slide, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted }) {
  const questions = slide.questions || []

  const calcScore = () => {
    let score = 0
    questions.forEach(q => {
      const ans = (quizAnswers[q.id] || '').trim().toLowerCase()
      const correct = (q.correct || q.answer || '').trim().toLowerCase()
      if (ans === correct) score++
    })
    return score
  }

  const score   = quizSubmitted ? calcScore() : null
  const allDone = questions.every(q => (quizAnswers[q.id] || '').trim())

  return (
    <div className="flex flex-col h-full px-10 py-8 overflow-y-auto animate-slideLeft font-body">
      <div className="mb-6">
        <p className="text-gold/60 text-xs tracking-widest uppercase mb-2">Chapter Quiz</p>
        <h2 className="font-display text-2xl text-gold">Test Your Knowledge</h2>
        <div className="w-12 h-0.5 bg-gold/40 mt-3" />
      </div>

      {/* Score banner */}
      {quizSubmitted && (
        <div className={`mb-6 p-4 rounded-xl border animate-slideUp ${
          score >= questions.length * 0.8
            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
            : score >= questions.length * 0.5
            ? 'bg-amber-950/50 border-amber-500/40 text-amber-400'
            : 'bg-red-950/50 border-red-500/40 text-red-400'
        }`}>
          <p className="font-display text-xl">
            {score} / {questions.length} correct
            {score === questions.length ? ' — Perfect! 🏆' : score >= questions.length * 0.8 ? ' — Excellent!' : score >= questions.length * 0.5 ? ' — Good effort!' : ' — Keep studying!'}
          </p>
        </div>
      )}

      <div className="space-y-5">
        {questions.map((q, qi) => {
          const answered  = quizAnswers[q.id] || ''
          const correct   = (q.correct || q.answer || '').trim()
          const isCorrect = answered.trim().toLowerCase() === correct.toLowerCase()

          return (
            <div key={q.id || qi} className="bg-navy rounded-xl p-5 border border-gold/15 animate-slideUp" style={{ animationDelay: `${qi * 0.06}s` }}>
              <div className="flex items-start gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs flex items-center justify-center shrink-0 font-display font-bold">{qi + 1}</span>
                <p className="text-parchment text-sm leading-relaxed">{q.question}</p>
                {quizSubmitted && (
                  <span className={`ml-auto shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {isCorrect ? <IconCheck /> : <IconX />}
                  </span>
                )}
              </div>

              {/* MCQ */}
              {q.kind === 'mcq' && (
                <div className="space-y-2 ml-7">
                  {(q.options || []).map((opt, oi) => {
                    const letter   = ['A','B','C','D'][oi]
                    const selected = answered === letter
                    const isRight  = letter === correct
                    let cls = 'border-white/15 text-parchment-dim'
                    if (quizSubmitted) {
                      if (isRight) cls = 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                      else if (selected && !isRight) cls = 'border-red-500/60 bg-red-950/40 text-red-300'
                    } else if (selected) {
                      cls = 'border-gold/60 bg-gold/10 text-parchment'
                    }
                    return (
                      <label key={oi} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 text-sm ${cls} ${!quizSubmitted ? 'hover:border-gold/40 hover:text-parchment' : ''}`}>
                        <input
                          type="radio"
                          name={`q_${q.id || qi}`}
                          value={letter}
                          checked={selected}
                          onChange={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id || `q${qi}`]: letter }))}
                          className="hidden"
                        />
                        <span className="w-5 h-5 rounded border border-current flex items-center justify-center text-xs font-display font-bold shrink-0">{letter}</span>
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Fill in the blank */}
              {q.kind === 'fitb' && (
                <div className="ml-7">
                  <input
                    type="text"
                    value={answered}
                    onChange={e => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id || `q${qi}`]: e.target.value }))}
                    disabled={quizSubmitted}
                    placeholder="Type your answer…"
                    className={`w-full bg-navy-2 rounded-lg px-3 py-2 text-sm border focus:outline-none transition-all duration-150 ${
                      quizSubmitted
                        ? isCorrect ? 'border-emerald-500/50 text-emerald-300' : 'border-red-500/50 text-red-300'
                        : 'border-gold/25 text-parchment placeholder-parchment-dim/40 focus:border-gold/50'
                    }`}
                  />
                  {quizSubmitted && !isCorrect && (
                    <p className="text-xs text-emerald-400 mt-1.5">Correct: <span className="font-medium">{correct}</span></p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit button */}
      {!quizSubmitted && (
        <button
          onClick={() => setQuizSubmitted(true)}
          disabled={!allDone}
          className={`mt-6 py-3 rounded-xl font-medium text-sm tracking-wide transition-all duration-200 ${
            allDone
              ? 'bg-gold text-navy hover:bg-gold-lt gold-glow'
              : 'bg-gold/15 text-gold/40 cursor-not-allowed'
          }`}
        >
          Submit Quiz
        </button>
      )}
      {quizSubmitted && (
        <button
          onClick={() => { setQuizSubmitted(false); setQuizAnswers({}) }}
          className="mt-4 py-2.5 rounded-xl text-sm text-parchment-dim hover:text-parchment border border-white/10 hover:border-white/20 transition-all duration-200"
        >
          Retake Quiz
        </button>
      )}
    </div>
  )
}

// ─── SlideViewer ──────────────────────────────────────────────────────────────

function SlideViewer({ chapters, slides, selectedChapter, currentSlide, setCurrentSlide }) {
  const [quizAnswers,    setQuizAnswers]    = useState({})
  const [quizSubmitted,  setQuizSubmitted]  = useState(false)
  const [slideDir,       setSlideDir]       = useState('left')
  const [animKey,        setAnimKey]        = useState(0)

  const chapter     = chapters[selectedChapter]
  const chapterSlides = slides[selectedChapter] || []
  const slide       = chapterSlides[currentSlide]
  const total       = chapterSlides.length

  // Reset quiz when chapter changes
  useEffect(() => {
    setQuizAnswers({})
    setQuizSubmitted(false)
  }, [selectedChapter])

  const goTo = (dir) => {
    const next = currentSlide + dir
    if (next < 0 || next >= total) return
    // Reset quiz if navigating away from quiz slide
    if (slide?.type === 'quiz') { setQuizAnswers({}); setQuizSubmitted(false) }
    setSlideDir(dir > 0 ? 'left' : 'right')
    setAnimKey(k => k + 1)
    setCurrentSlide(next)
  }

  if (!chapter || !slide) {
    return (
      <div className="flex-1 flex items-center justify-center text-parchment-dim font-body">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-sm">Building slides…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-body">
      {/* Top bar: chapter progress */}
      <div className="px-6 py-3 border-b border-gold/10 flex items-center gap-4">
        <p className="text-xs text-parchment-dim">
          <span className="text-gold font-medium">{chapter.title}</span>
        </p>
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold/60 rounded-full transition-all duration-500"
            style={{ width: `${((currentSlide + 1) / total) * 100}%` }}
          />
        </div>
        <p className="text-xs text-parchment-dim shrink-0">{currentSlide + 1} / {total}</p>
      </div>

      {/* Slide area */}
      <div className="flex-1 overflow-hidden relative">
        <div
          key={animKey}
          className={slideDir === 'left' ? 'slide-enter' : 'slide-enter-reverse'}
          style={{ height: '100%' }}
        >
          {slide.type === 'title' && (
            <TitleSlide slide={slide} chapterNum={selectedChapter + 1} totalChapters={chapters.length} />
          )}
          {slide.type === 'concept' && <ConceptSlide slide={slide} />}
          {slide.type === 'model' && <ModelSlide slide={slide} />}
          {slide.type === 'quiz' && (
            <QuizSlide
              slide={slide}
              quizAnswers={quizAnswers}
              setQuizAnswers={setQuizAnswers}
              quizSubmitted={quizSubmitted}
              setQuizSubmitted={setQuizSubmitted}
            />
          )}
          {/* Definition slide (rendered as concept style) */}
          {slide.type === 'definition' && (
            <div className="flex flex-col h-full px-10 py-8 animate-slideLeft overflow-y-auto">
              <p className="text-gold/60 text-xs tracking-widest uppercase mb-2">Definition</p>
              <h2 className="font-display text-3xl text-gold mb-4">{slide.term}</h2>
              <div className="w-12 h-0.5 bg-gold/40 mb-6" />
              <p className="text-parchment text-base leading-relaxed">{slide.definition}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-gold/10 flex items-center justify-between">
        <button
          onClick={() => goTo(-1)}
          disabled={currentSlide === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentSlide === 0
              ? 'text-parchment-dim/30 cursor-not-allowed'
              : 'text-parchment-dim hover:text-parchment hover:bg-white/5 border border-transparent hover:border-white/10'
          }`}
        >
          <IconChevronLeft /> Previous
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {chapterSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setSlideDir(i > currentSlide ? 1 : -1); setAnimKey(k => k+1); setCurrentSlide(i) }}
              className={`rounded-full transition-all duration-200 ${
                i === currentSlide
                  ? 'w-4 h-1.5 bg-gold'
                  : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(1)}
          disabled={currentSlide === total - 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentSlide === total - 1
              ? 'text-parchment-dim/30 cursor-not-allowed'
              : 'text-parchment-dim hover:text-parchment hover:bg-white/5 border border-transparent hover:border-white/10'
          }`}
        >
          Next <IconChevronRight />
        </button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [stage,          setStage]          = useState('input')   // 'input' | 'loading' | 'ready'
  const [loadingPhase,   setLoadingPhase]   = useState(null)      // 'extracting' | 'agent1' | 'agent2'
  const [loadingDetail,  setLoadingDetail]  = useState('')
  const [agent2Progress, setAgent2Progress] = useState({ done: 0, total: 0 })
  const [chapters,       setChapters]       = useState([])
  const [slides,         setSlides]         = useState({})
  const [selectedChapter,setSelectedChapter]= useState(0)
  const [currentSlide,   setCurrentSlide]   = useState(0)
  const [error,          setError]          = useState(null)

  const handleSelectChapter = (idx) => {
    setSelectedChapter(idx)
    setCurrentSlide(0)
  }

  const handleSubmit = async ({ mode, text, files }) => {
    setStage('loading')
    setError(null)

    try {
      // ── Step 1: Extract text ──────────────────────────────────────
      let fullText = ''
      if (mode === 'text') {
        fullText = text
      } else {
        const fileList = files
        for (let i = 0; i < fileList.length; i++) {
          setLoadingPhase('extracting')
          setLoadingDetail(`Extracting PDF ${i + 1} of ${fileList.length}: ${fileList[i].name}`)
          const t = await extractPdfText(fileList[i], (page, total) => {
            setLoadingDetail(`Extracting PDF ${i + 1} of ${fileList.length} — page ${page}/${total}`)
          })
          fullText += `\n\n--- Document: ${fileList[i].name} ---\n\n` + t
        }
      }

      if (!fullText.trim()) throw new Error('No text could be extracted.')

      // Truncate if very long (API limit safety)
      const MAX_CHARS = 30000
      if (fullText.length > MAX_CHARS) {
        fullText = fullText.slice(0, MAX_CHARS) + '\n\n[Content truncated for processing…]'
      }

      // ── Step 2: Agent 1 ───────────────────────────────────────────
      setLoadingPhase('agent1')
      setLoadingDetail('Analyzing content and extracting structure…')

      const agent1System = `You are an expert academic content analyzer. Your job is to read educational or informational text and extract structured information.

IMPORTANT: You must respond with ONLY valid JSON — no markdown, no explanation, no code fences. Just raw JSON.`

      const agent1User = `Analyze the following text and extract all chapters or major sections. For each chapter/section, identify:
- title: the name of the chapter or section (string)
- concepts: array of key concepts, each with { "name": string, "explanation": string }
- definitions: array of important terms, each with { "term": string, "definition": string }
- models: array of frameworks or models mentioned, each with { "name": string, "description": string, "components": [string or { "label": string, "detail": string }] }
- summary: a 2-3 sentence overview of the chapter

If the text has no clear chapters, treat it as one chapter with the most appropriate title.

Return ONLY this JSON structure (no markdown, no code fences):
{
  "chapters": [
    {
      "title": "string",
      "concepts": [{ "name": "string", "explanation": "string" }],
      "definitions": [{ "term": "string", "definition": "string" }],
      "models": [{ "name": "string", "description": "string", "components": [] }],
      "summary": "string"
    }
  ]
}

TEXT TO ANALYZE:
${fullText}`

      const agent1Raw  = await callClaude(agent1System, agent1User)
      const agent1Data = extractJSON(agent1Raw)
      const extractedChapters = agent1Data.chapters || []
      if (!extractedChapters.length) throw new Error('Agent 1 returned no chapters.')
      setChapters(extractedChapters)

      // ── Step 3: Agent 2 (per chapter) ────────────────────────────
      setLoadingPhase('agent2')
      setAgent2Progress({ done: 0, total: extractedChapters.length })

      const agent2System = `You are an expert educational slide builder. Your job is to create interactive, informative slide decks from chapter content.

IMPORTANT: You must respond with ONLY valid JSON — no markdown, no explanation, no code fences. Just raw JSON.`

      const allSlides = {}
      for (let i = 0; i < extractedChapters.length; i++) {
        const ch = extractedChapters[i]
        setLoadingDetail(`Building slides for: ${ch.title}`)

        const agent2User = `Build an interactive slide deck for this chapter. Create slides in this exact order:

1. A title slide
2. One concept slide per key concept (include all concepts)
3. One model/framework slide if there are any models (skip if no models)
4. One quiz slide at the end with exactly 3 MCQ and 2 fill-in-the-blank questions

Chapter data:
${JSON.stringify(ch, null, 2)}

Return ONLY this JSON structure (no markdown, no code fences):
{
  "slides": [
    {
      "type": "title",
      "title": "string",
      "subtitle": "string (optional tagline or theme)",
      "summary": "string (2-3 sentences about this chapter)"
    },
    {
      "type": "concept",
      "conceptName": "string",
      "explanation": "string",
      "bullets": ["string", "string", "string"]
    },
    {
      "type": "model",
      "modelName": "string",
      "description": "string",
      "components": [{ "label": "string", "detail": "string" }]
    },
    {
      "type": "quiz",
      "questions": [
        {
          "id": "q1",
          "kind": "mcq",
          "question": "string",
          "options": ["A text", "B text", "C text", "D text"],
          "correct": "A"
        },
        {
          "id": "q2",
          "kind": "mcq",
          "question": "string",
          "options": ["A text", "B text", "C text", "D text"],
          "correct": "B"
        },
        {
          "id": "q3",
          "kind": "mcq",
          "question": "string",
          "options": ["A text", "B text", "C text", "D text"],
          "correct": "C"
        },
        {
          "id": "q4",
          "kind": "fitb",
          "question": "Complete the sentence: The ___ is responsible for...",
          "answer": "exact answer word or phrase"
        },
        {
          "id": "q5",
          "kind": "fitb",
          "question": "What term describes ___?",
          "answer": "exact answer word or phrase"
        }
      ]
    }
  ]
}`

        const agent2Raw   = await callClaude(agent2System, agent2User)
        const agent2Data  = extractJSON(agent2Raw)
        allSlides[i]      = agent2Data.slides || []
        setSlides({ ...allSlides })
        setAgent2Progress({ done: i + 1, total: extractedChapters.length })
      }

      setStage('ready')
      setSelectedChapter(0)
      setCurrentSlide(0)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStage('input')
    }
  }

  // ── Error Banner ────────────────────────────────────────────────
  const ErrorBanner = () => error ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-950 border border-red-500/50 text-red-300 px-5 py-3 rounded-xl text-sm font-body max-w-lg animate-slideUp shadow-xl">
      <strong>Error:</strong> {error}
      <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-200">✕</button>
    </div>
  ) : null

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-navy">
      <ErrorBanner />

      {stage === 'input' && (
        <InputPanel onSubmit={handleSubmit} loading={false} />
      )}

      {stage === 'loading' && (
        <LoadingOverlay
          phase={loadingPhase}
          detail={loadingDetail}
          agent2Progress={agent2Progress}
        />
      )}

      {stage === 'ready' && (
        <div className="flex h-full overflow-hidden">
          <Sidebar
            chapters={chapters}
            selectedChapter={selectedChapter}
            onSelect={handleSelectChapter}
            slides={slides}
          />
          <main className="flex-1 flex overflow-hidden">
            <SlideViewer
              chapters={chapters}
              slides={slides}
              selectedChapter={selectedChapter}
              currentSlide={currentSlide}
              setCurrentSlide={setCurrentSlide}
            />
          </main>
          {/* Reset button */}
          <button
            onClick={() => { setStage('input'); setChapters([]); setSlides({}); setError(null) }}
            className="fixed bottom-6 right-6 px-4 py-2 rounded-xl text-xs font-body text-parchment-dim hover:text-parchment bg-navy-2 border border-white/10 hover:border-white/20 transition-all duration-200"
          >
            ← New Book
          </button>
        </div>
      )}
    </div>
  )
}
