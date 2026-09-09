import { toast } from "sonner";

type ToastProps = {
  type: "success" | "error";
  message: string;
};
export default function showToast({ type, message }: ToastProps) {
  if (type === "success") {
    toast.success(message, {
      position: "top-center",
      duration: 1500,
    });
  }
  if (type === "error") {
    toast.error(message, {
      position: "top-center",
      duration: 1500,
    });
  }
}
