import { useEffect, useState } from "react";
import Amplify, { API, graphqlOperation } from "aws-amplify";
import log from "loglevel";

import awsExports from "./aws-exports";
import { createSuunnitelma } from "./graphql/mutations";
import { listSuunnitelmat } from "./graphql/queries";
import { Suunnitelma } from "./API";
import CSS from "csstype";

Amplify.configure(awsExports);

log.setDefaultLevel("DEBUG");

const initialState = { name: "", location: "", description: "", longDescription: "" };

const App = () => {
  const [formState, setFormState] = useState(initialState);
  const [suunnitelmat, setSuunnitelmat] = useState<Suunnitelma[]>([]);

  useEffect(() => {
    fetchSuunnitelmat();
  }, []);

  function setInput(key: string, value: string) {
    setFormState({ ...formState, [key]: value });
  }

  async function fetchSuunnitelmat() {
    const result = await API.graphql(graphqlOperation(listSuunnitelmat));
    log.info("listSuunnitelmat:", result);
    // @ts-ignore
    setSuunnitelmat(result.data.listSuunnitelmat);
  }

  async function onCreateSuunnitelma() {
    try {
      if (!formState.name) {
        return;
      }

      const suunnitelma = { ...formState };
      log.info("Luodaan:", suunnitelma);
      const result = await API.graphql(graphqlOperation(createSuunnitelma, { suunnitelma }));
      await fetchSuunnitelmat();
      setFormState(initialState);
      log.info("Luonnin tulos:", result);
    } catch (err) {
      log.error("error creating suunnitelma:", err);
    }
  }

  return (
    <div style={styles.container}>
      <h2>HASSU</h2>
      <input
        onChange={(event) => setInput("name", event.target.value)}
        style={styles.input}
        value={formState.name}
        placeholder="Suunnitelman nimi"
      />
      <input
        onChange={(event) => setInput("location", event.target.value)}
        style={styles.input}
        value={formState.location}
        placeholder="Sijainti"
      />
      <input
        onChange={(event) => setInput("description", event.target.value)}
        style={styles.input}
        value={formState.description}
        placeholder="Kuvaus"
      />
      <input
        onChange={(event) => setInput("longDescription", event.target.value)}
        style={styles.input}
        value={formState.longDescription}
        placeholder="Pitkä kuvaus"
      />
      <button style={styles.button} onClick={onCreateSuunnitelma}>
        Luo uusi suunnitelma
      </button>
      {suunnitelmat.map((suunnitelma, index) => (
        <div key={suunnitelma.id ? suunnitelma.id : index} style={styles.suunnitelma}>
          <p style={styles.suunnitelmaNimi}>
            {suunnitelma.name} ({suunnitelma.location}) {suunnitelma.status}
          </p>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    width: "400px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "20px",
  } as CSS.Properties,
  suunnitelma: { marginBottom: "15px" } as CSS.Properties,
  input: {
    border: "none",
    backgroundColor: "#ddd",
    marginBottom: "10px",
    padding: "8px",
    fontSize: "18px",
  } as CSS.Properties,
  suunnitelmaNimi: { fontSize: "20px", fontWeight: "bold" } as CSS.Properties,
  suunnitelmaSijainti: { marginBottom: 0 } as CSS.Properties,
  button: {
    backgroundColor: "black",
    color: "white",
    outline: "none",
    fontSize: "18px",
    padding: "12px 0px",
  } as CSS.Properties,
};

export default App;
