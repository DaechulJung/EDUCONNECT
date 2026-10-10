"""Log masking (AD-10): every log record passes a filter that hides Azure OpenAI values."""

import logging
from urllib.parse import urlsplit

from app.core.config import Settings, settings

MASK = "***"
_LOGGERS = ("", "uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "openai", "httpx", "app")


def secret_values(config: Settings) -> list[str]:
    """Key, endpoint and base URL values plus their host names, longest first."""
    values = [
        config.azure_openai_api_key,
        config.azure_openai_endpoint,
        config.azure_openai_base_url,
    ]
    for url in (config.azure_openai_endpoint, config.azure_openai_base_url):
        host = urlsplit(url).hostname if url else None
        if host:
            values.append(host)
    return sorted({value for value in values if value and len(value) >= 4}, key=len, reverse=True)


def mask(text: str, config: Settings = settings) -> str:
    for value in secret_values(config):
        text = text.replace(value, MASK)
    return text


class MaskingFilter(logging.Filter):
    def __init__(self, config: Settings = settings):
        super().__init__()
        self.config = config

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple):
            # Keep the tuple: uvicorn's access formatter unpacks it. Mask each argument
            # instead; non-strings stay as they are unless their text holds a secret.
            record.msg = mask(str(record.msg), self.config)
            record.args = tuple(self._mask_arg(arg) for arg in record.args)
        else:
            record.msg = mask(record.getMessage(), self.config)
            record.args = None
        if record.exc_info:
            text = logging.Formatter().formatException(record.exc_info)
            record.exc_text = mask(text, self.config)
            record.exc_info = None
        return True

    def _mask_arg(self, arg: object) -> object:
        text = str(arg)
        masked = mask(text, self.config)
        if isinstance(arg, str) or masked != text:
            return masked
        return arg


def install(config: Settings = settings) -> MaskingFilter:
    """Attach the filter to the loggers and to every handler already configured."""
    masking = MaskingFilter(config)
    for name in _LOGGERS:
        target = logging.getLogger(name)
        if not any(isinstance(f, MaskingFilter) for f in target.filters):
            target.addFilter(masking)
        for handler in target.handlers:
            if not any(isinstance(f, MaskingFilter) for f in handler.filters):
                handler.addFilter(masking)
    return masking
