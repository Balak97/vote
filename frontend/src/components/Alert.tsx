type AlertProps = {
  type: "error" | "success" | "info";
  children: React.ReactNode;
};

export default function Alert({ type, children }: AlertProps) {
  return (
    <div className={`alert alert--${type}`} role="alert">
      {children}
    </div>
  );
}
