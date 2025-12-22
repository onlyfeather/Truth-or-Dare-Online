import { io } from "socket.io-client";

// 读取环境变量，如果没读到则默认为 localhost
const URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const socket = io(URL, {
  autoConnect: false, // 建议手动控制连接时机，或者设为 true
  transports: ["websocket"] // 推荐强制使用 websocket，性能更好
});

// 方便调试
socket.on("connect_error", (err) => {
  console.error("Socket连接失败:", err);
});

export default socket;