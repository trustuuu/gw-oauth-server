let sessionData = null;

onconnect = function (e) {
  const port = e.ports[0];

  // 초기값 전송
  port.postMessage({ type: "INIT", data: sessionData });

  port.onmessage = function (event) {
    if (event.data.type === "SET_SESSION") {
      sessionData = event.data.data;

      // 모든 연결된 포트에 broadcast
      self.clients.forEach((clientPort) => {
        clientPort.postMessage({ type: "SESSION_UPDATED", data: sessionData });
      });
    }
  };

  // 연결 관리
  self.clients = self.clients || [];
  self.clients.push(port);
};
