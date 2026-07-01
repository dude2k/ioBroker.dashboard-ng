import type { MouseEventHandler, ReactNode } from "react";
import { RuntimeIcon } from "./icons";

interface RuntimeContainerProps {
  children: ReactNode;
  className?: string | undefined;
}

export function RuntimeContainer({ children, className = "" }: RuntimeContainerProps) {
  return <div className={`dng-runtime-container ${className}`.trim()}>{children}</div>;
}

interface RuntimeTextProps {
  children: ReactNode;
  muted?: boolean;
  strong?: boolean;
  className?: string | undefined;
}

export function RuntimeText({
  children,
  muted = false,
  strong = false,
  className = "",
}: RuntimeTextProps) {
  const Tag = strong ? "strong" : "span";
  return (
    <Tag className={`dng-runtime-text ${muted ? "is-muted" : ""} ${className}`.trim()}>
      {children}
    </Tag>
  );
}

interface RuntimeValueProps {
  value: ReactNode;
  unit?: string | undefined;
  className?: string | undefined;
}

export function RuntimeValue({ value, unit, className = "" }: RuntimeValueProps) {
  return (
    <strong className={`dng-runtime-value ${className}`.trim()}>
      {value}
      {unit ? <small>{unit}</small> : null}
    </strong>
  );
}

interface RuntimeImageProps {
  src?: string | undefined;
  alt?: string | undefined;
}

export function RuntimeImage({ src, alt = "" }: RuntimeImageProps) {
  if (!src) {
    return (
      <div className="dng-runtime-image is-empty">
        <RuntimeIcon name="ImageOff" size={28} />
      </div>
    );
  }

  return <img className="dng-runtime-image" src={src} alt={alt} loading="lazy" />;
}

interface RuntimeButtonProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string | undefined;
  title?: string | undefined;
  onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
}

export function RuntimeButton({
  children,
  disabled = false,
  className = "",
  title,
  onClick,
}: RuntimeButtonProps) {
  return (
    <button
      className={`dng-runtime-button ${className}`.trim()}
      disabled={disabled}
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
