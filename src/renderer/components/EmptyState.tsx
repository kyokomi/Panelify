import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, children, className = "" }) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-content">
        {icon && <div className="empty-state-icon">{icon}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children && <div className="empty-state-actions">{children}</div>}
      </div>
    </div>
  );
};

export default EmptyState;
