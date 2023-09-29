import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ProjektiTestCommand } from "common/testUtil.dev";
import { useState } from "react";

export default function Ajansiirto({ oid }: { oid: string }) {
  const [value, setValue] = useState("0");
  return (
    <div
      role="navigation"
      style={{
        marginBottom: "1em",
        padding: "0.1em",
        background: "linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet, red)",
      }}
    >
      <div style={{ width: "100%", height: "100%", padding: "1.1em", background: "white" }}>
        <h3 className="text-primary-dark">
          <FontAwesomeIcon
            icon="magic"
            className="text-primary-dark"
            size="lg"
            style={{
              margin: "auto",
              height: "100%",
            }}
          />
          <span style={{ marginLeft: "1em", marginRight: "1em" }}>AJANSIIRTO</span>
        </h3>
        <TextInput
          type="number"
          label="Siirrä projektin päivämääriä x päivää menneisyyteen"
          value={value || 0}
          onChange={(e) => {
            const input = e.target.value;
            const parsed = parseInt(input);
            if (input === "" || (!isNaN(parsed) && parsed >= 0)) {
              setValue(input);
            }
          }}
        />
        <Button
          style={{
            borderRadius: 0,
            marginTop: "0.5em",
          }}
          disabled={!parseInt(value)}
          onClick={(e) => {
            e.preventDefault();
            window.location.assign(ProjektiTestCommand.oid(oid).ajansiirto(value));
          }}
        >
          <span>Siirrä</span>
        </Button>
      </div>
    </div>
  );
}
