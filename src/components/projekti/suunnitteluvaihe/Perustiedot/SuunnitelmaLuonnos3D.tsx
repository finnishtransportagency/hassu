// Contains code generated or recommended by Amazon Q
import { useFormContext } from "react-hook-form";
import { ReactElement } from "react";
import { Kielitiedot } from "@services/api";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { SuunnittelunPerustiedotFormValues } from ".";
import TextInput from "@components/form/TextInput";
import Section from "@components/layout/Section2";
import { label } from "src/util/textUtil";

type Props = {
  kielitiedot: Kielitiedot | null | undefined;
};

export default function SuunnitelmaLuonnos3D({ kielitiedot }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    trigger,
  } = useFormContext<SuunnittelunPerustiedotFormValues>();

  if (!kielitiedot) return <></>;
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section>
      <h4 className="vayla-small-title">Suunnitelmaluonnoksen 3D-näkymä</h4>
      <p>Suunnitelmaluonnoksen 3D-näkymän lisääminen on vapaaehtoista.</p>

      {ensisijainenKaannettavaKieli && (
        <div className="pb-4 mb-4">
          {toissijainenKaannettavaKieli && (
            <h5 className="vayla-smallest-title">
              {label({ label: "suunnitelmaluonnos3D", inputLanguage: ensisijainenKaannettavaKieli, kielitiedot })}
            </h5>
          )}
          <TextInput
            style={{ width: "100%" }}
            label={label({ label: "Linkin kuvaus", inputLanguage: ensisijainenKaannettavaKieli, kielitiedot })}
            {...register(`vuorovaikutusKierros.suunnitelmaluonnos3d.${ensisijainenKaannettavaKieli}.nimi`, {
              onChange: () => {
                trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${ensisijainenKaannettavaKieli}.url`);
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${toissijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors as any)?.vuorovaikutusKierros?.suunnitelmaluonnos3d?.[ensisijainenKaannettavaKieli]?.nimi}
          />
          <TextInput
            style={{ width: "100%" }}
            label={label({ label: "Vektor.io linkki 3D-näkymään", inputLanguage: ensisijainenKaannettavaKieli, kielitiedot })}
            {...register(`vuorovaikutusKierros.suunnitelmaluonnos3d.${ensisijainenKaannettavaKieli}.url`, {
              onChange: () => {
                trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${ensisijainenKaannettavaKieli}.nimi`);
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${toissijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors as any)?.vuorovaikutusKierros?.suunnitelmaluonnos3d?.[ensisijainenKaannettavaKieli]?.url}
          />
        </div>
      )}

      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <div className="pb-4 mb-4">
          <h5 className="vayla-smallest-title">
            {label({ label: "suunnitelmaluonnos3D", inputLanguage: toissijainenKaannettavaKieli, kielitiedot })}
          </h5>
          <TextInput
            style={{ width: "100%" }}
            label={label({ label: "Linkin kuvaus", inputLanguage: toissijainenKaannettavaKieli, kielitiedot })}
            {...register(`vuorovaikutusKierros.suunnitelmaluonnos3d.${toissijainenKaannettavaKieli}.nimi`, {
              onChange: () => {
                trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${toissijainenKaannettavaKieli}.url`);
                trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors as any)?.vuorovaikutusKierros?.suunnitelmaluonnos3d?.[toissijainenKaannettavaKieli]?.nimi}
          />
          <TextInput
            style={{ width: "100%" }}
            label={label({ label: "Linkki 3D-suunnitelmaluonnokseen", inputLanguage: toissijainenKaannettavaKieli, kielitiedot })}
            {...register(`vuorovaikutusKierros.suunnitelmaluonnos3d.${toissijainenKaannettavaKieli}.url`, {
              onChange: () => {
                trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${toissijainenKaannettavaKieli}.nimi`);
                trigger(`vuorovaikutusKierros.suunnitelmaluonnos3d.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors as any)?.vuorovaikutusKierros?.suunnitelmaluonnos3d?.[toissijainenKaannettavaKieli]?.url}
          />
        </div>
      )}
    </Section>
  );
}
