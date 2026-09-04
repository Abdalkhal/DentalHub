// Minimal toast adapter replacing `sonner`. Screens call `toast.*`; the UI is
// rendered by <ToastHost/> (mounted once in the root layout).

export type ToastKind = "success" | "error" | "info" | "warning";
type ToastHandler = (message: string, kind?: ToastKind) => void;

let handler: ToastHandler = () => {};

export const toast = {
  configure(h: ToastHandler) {
    handler = h;
  },
  success(message: string) {
    handler(message, "success");
  },
  error(message: string) {
    handler(message, "error");
  },
  info(message: string) {
    handler(message, "info");
  },
  warning(message: string) {
    handler(message, "warning");
  },
};
