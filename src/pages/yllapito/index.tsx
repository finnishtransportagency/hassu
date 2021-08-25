import CSS from "csstype";
import { SuunnitelmaList } from "../../components/suunnitelmaList";
import Link from "next/link";

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
  button: {
    backgroundColor: "black",
    color: "white",
    outline: "none",
    fontSize: "18px",
    padding: "12px 0px",
  } as CSS.Properties,
};

export default () => {
  return (
    <div style={styles.container}>
      <Link href="/yllapito/suunnitelma">
        <a className="btn btn-sm btn-success mb-2">Uusi suunnitelma</a>
      </Link>
      <SuunnitelmaList admin={true}/>
    </div>
  );
};
