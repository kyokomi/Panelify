import React, { useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  dropdownClassName?: string;
  isControlled?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  className = "",
  dropdownClassName = "",
  isControlled = false,
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen = isControlled ? (controlledIsOpen ?? false) : internalIsOpen;

  const toggleDropdown = () => {
    const newIsOpen = !isOpen;
    if (isControlled) {
      onToggle?.(newIsOpen);
    } else {
      setInternalIsOpen(newIsOpen);
    }
  };

  const closeDropdown = useCallback(() => {
    if (isControlled) {
      onToggle?.(false);
    } else {
      setInternalIsOpen(false);
    }
  }, [isControlled, onToggle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <div onClick={toggleDropdown} className="dropdown-trigger">
        {trigger}
      </div>

      {isOpen && <div className={`dropdown-content ${dropdownClassName}`}>{children}</div>}
    </div>
  );
};

export default Dropdown;

