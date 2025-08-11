import React from "react";

export type ButtonVariant = "primary" | "secondary" | "icon" | "menu-item" | "file";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "medium",
  disabled = false,
  active = false,
  title,
  className = "",
  type = "button",
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case "primary":
        return "btn-primary";
      case "secondary":
        return "btn-secondary";
      case "icon":
        return "btn-icon";
      case "menu-item":
        return active ? "mode-option active" : "mode-option";
      case "file":
        return "btn-file";
      default:
        return "btn-primary";
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "small":
        return "btn-small";
      case "medium":
        return "btn-medium";
      case "large":
        return "btn-large";
      default:
        return "btn-medium";
    }
  };

  const combinedClassName = ["btn", getVariantClass(), getSizeClass(), disabled && "btn-disabled", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={combinedClassName} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
};

export default Button;
