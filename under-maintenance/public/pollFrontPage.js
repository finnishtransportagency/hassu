function poll() {
  fetch("/", { redirect: "manual" }).then((response) => {
    if (response.status === 200) {
      window.location.pathname = "/";
    } else {
      setTimeout(poll, 30000);
    }
  });
}

setTimeout(poll, 30000);
