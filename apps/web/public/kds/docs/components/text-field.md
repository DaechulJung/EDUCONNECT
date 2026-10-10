BADGE Mobile/Desktop/반응형
설명: 한 줄·여러 줄 입력, 형식 입력, 도움말, 입력 그룹. 짧은 값=TextField, 긴 내용=TextArea, 주민/사업자등록번호=TextFieldFormatted.
import { TextField } from "@BG002501-KT-Com/kt-ux-design/text-field"
※ 형식: export 표(기반 요소/주요 props → 역할)

## 입력 컴포넌트
TextField → native input props(size, type 제외); label, noLabel, inputType, masked, maskingCharacter, helperText, error, leftIcon, showClearButton, onClear, containerClassName, inputClassName, theme ⟨한 줄 입력 + clear·password. TextFieldHelperText = HelperText alias⟩
  inputType → native 타입 + default | id | certification | national-id
TextFieldFormatted → native input props(size, type, value, onChange 제외); formatType(national-id | business-id), value, onChange, defaultMasked, maskingCharacter ⟨숫자 관리 + 구분 기호·마스킹 표시⟩
TextArea → native textarea props(size 제외); label, helperText, helperTextType, error, complete, typing, maxLength, showCounter, theme ⟨여러 줄 + 글자 수 카운터. TextAreaHelperText = alias⟩
textFieldVariants, TextFieldVariants, textAreaVariants, TextAreaVariants export.

## Text Field 슬롯
TextFieldButton → native button props; variant, size ⟨중복확인·재전송 우측 액션⟩
TextFieldIconButton → native button props; icon ⟨아이콘 우측 액션, accessible name 필요⟩
TextFieldTimer → seconds, onExpire, format ⟨인증번호 남은 시간⟩
TextFieldLabel → native label props ⟨내부 floating label. 보통 TextField.label 사용⟩

## 도움말
HelperText → native div props; type(default | error | success | info), theme
HelperTextValidation → native div props; theme ⟨검증 항목 컨테이너⟩
HelperTextItemValidation → native div props; state(default | success | error)
HelperTextWithButton → native div props; buttonLabel, onButtonClick, buttonDisabled, theme
HelperTextCounter → native div props; count, maxCount, theme
helperTextVariants / HelperTextVariants export.

## 입력 그룹
InputGroup → native div props; label, noLabel, helperText, helperType, gap, disabled, theme ⟨레이블·도움말 공유 가로 묶음⟩
InputGroupItem → native div props; flex
InputGroupLabel → native label props ⟨그룹/데스크톱 외부 레이블⟩

Examples: Default / Types(기본·비밀번호·아이디+중복확인·인증번호+타이머+재전송·검색, 형식 입력 주민/사업자) / States(한 줄·여러 줄) / Text Area & Helpers / Input Groups(휴대폰 번호) / Interaction
Figma: Text Field Type · Spec
