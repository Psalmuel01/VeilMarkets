import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WalletWrapper } from "./components/WalletWrapper.tsx";

createRoot(document.getElementById("root")!).render(<WalletWrapper><App /></WalletWrapper>);
