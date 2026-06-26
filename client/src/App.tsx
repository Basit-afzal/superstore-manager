import AppRoutes from "@/routes";
import { Toaster } from "@/components/ui/sonner";
import { Fragment } from "react/jsx-runtime";

export default function App() {
  return (
    <Fragment>
      <AppRoutes />
      <Toaster richColors position="top-right" />
    </Fragment>
  );
}
