BADGE Mobile/Desktop
설명: 프롬프트 입력·전송 multiline field. 일반 입력, 음성 인식, 첨부 파일, AI tool 상태를 하나의 public component에서 제어.
import { PromptTextField } from "@BG002501-KT-Com/kt-ux-design/prompt-text-field"

## PromptTextField  (HTMLAttributes<HTMLDivElement>)
state → default | focused | disabled | processing ⟨default⟩
placeholder → string ⟨"원하는 업무를 입력하세요"⟩
value, onValueChange → string, (value) => void ⟨비제어⟩
onSend, onPause → (value) => void, () => void
mode, onModeChange → default | listening, (mode) => void ⟨default⟩
enableVoice, enableAction → boolean ⟨true⟩
onVoiceClick, onKeyboardClick, onFileAddClick → () => void
sttText, sttTranscribing, onSttClear → string, boolean, () => void ⟨없음, false⟩
attachedFiles, onFileRemove → AttachedFile[], (id) => void
tool → PromptTextFieldToolConfig ⟨없음⟩ write·inference·search·deepDive·custom
disabled, inputClassName, textareaRef → boolean, string, RefObject<HTMLTextAreaElement> ⟨false⟩
showDisclaimer, disclaimerText → boolean, string ⟨true⟩
maxRows → number ⟨3⟩
showScrollToBottom, onScrollToBottom → boolean, () => void ⟨false⟩
theme → light | light-agent | dark | dark-agent ⟨전역 테마⟩
AttachedFile: id, name, type(image | document) 필수 + image는 url, document는 fileType. PromptTextFieldToolConfig: type, onClose 필수.
보조 컴포넌트: PromptTextFieldActionButton, VoiceButton, SendButton, AttachedFile, ScrollToBottomButton, UtilityMenu, FileArea, Disclaimer, Equalizer, Tool (root prop 대체 안 함).

Examples: Default / States(Default·Focused·Processing·Disabled) / Listening / Attachments / Subcomponents(Action buttons, Attached file states, Utility menu "Mi:dm Pro", Disclaimer·Equalizer) / Tool / Interaction
Figma: (없음)
