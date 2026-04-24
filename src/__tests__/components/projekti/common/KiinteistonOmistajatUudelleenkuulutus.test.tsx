// Contains code generated or recommended by Amazon Q
import { render, screen } from "@testing-library/react";
import { KiinteistonOmistajatUudelleenkuulutus } from "@components/projekti/common/KiinteistonOmistajatUudelleenkuulutus";
import { UudelleenKuulutus, UudelleenkuulutusTila, Vaihe } from "@services/api";
import { KiinteistonomistajatVaihe } from "@components/projekti/common/KiinteistonOmistajatOhje";
import { FormProvider, useForm } from "react-hook-form";
import React from "react";

const PAST_DATE = "2024-01-01";
const FUTURE_DATE = "2099-12-31";

let mockNyt = jest.fn();

jest.mock("src/hooks/useSuomifiUser", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("backend/src/util/dateUtil", () => ({
  ISO_DATE_FORMAT: "YYYY-MM-DD",
  nyt: () => mockNyt(),
}));

jest.mock("@components/StyledLink", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import useSuomifiUser from "src/hooks/useSuomifiUser";
import dayjs from "dayjs";

const mockedUseSuomifiUser = useSuomifiUser as jest.Mock;

function createUudelleenKuulutus(alkuperainenKuulutusPaiva: string): UudelleenKuulutus {
  return {
    __typename: "UudelleenKuulutus",
    tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
    alkuperainenKuulutusPaiva,
  };
}

function Wrapper({ children, defaultValues }: { children: React.ReactNode; defaultValues?: Record<string, unknown> }) {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

function renderComponent(
  props: {
    vaihe?: KiinteistonomistajatVaihe;
    oid?: string;
    uudelleenKuulutus?: UudelleenKuulutus | null;
  },
  defaultValues?: Record<string, unknown>
) {
  return render(
    <Wrapper defaultValues={defaultValues}>
      <KiinteistonOmistajatUudelleenkuulutus
        vaihe={props.vaihe}
        oid={props.oid ?? "test-oid"}
        uudelleenKuulutus={props.uudelleenKuulutus}
      />
    </Wrapper>
  );
}

function mockSuomifiEnabled(enabled: boolean) {
  mockedUseSuomifiUser.mockReturnValue({ data: { suomifiViestitEnabled: enabled } });
}

describe("KiinteistonOmistajatUudelleenkuulutus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNyt = jest.fn().mockReturnValue(dayjs("2024-06-15"));
  });

  describe("renderöi tyhjän", () => {
    it("kun uudelleenKuulutus on null", () => {
      mockSuomifiEnabled(true);
      const { container } = renderComponent({ vaihe: Vaihe.NAHTAVILLAOLO, uudelleenKuulutus: null });
      expect(container.innerHTML).toBe("");
    });

    it("kun vaihe on undefined", () => {
      mockSuomifiEnabled(true);
      const { container } = renderComponent({
        vaihe: undefined,
        uudelleenKuulutus: createUudelleenKuulutus(PAST_DATE),
      });
      expect(container.innerHTML).toBe("");
    });
  });

  describe("NAHTAVILLAOLO-vaihe", () => {
    it("näyttää radiobuttonit kun kuulutuspäivä on menneisyydessä", () => {
      mockSuomifiEnabled(true);
      renderComponent({
        vaihe: Vaihe.NAHTAVILLAOLO,
        uudelleenKuulutus: createUudelleenKuulutus(PAST_DATE),
      });
      expect(screen.getByText("Kiinteistönomistajille lähetetään tieto uudesta kuulutuksesta")).toBeInTheDocument();
      expect(screen.getByText("Kiinteistönomistajille ei lähetetä tietoa uudesta kuulutuksesta")).toBeInTheDocument();
    });

    it("näyttää radiobuttonit kun kuulutuspäivä on tänään", () => {
      mockSuomifiEnabled(true);
      renderComponent({
        vaihe: Vaihe.NAHTAVILLAOLO,
        uudelleenKuulutus: createUudelleenKuulutus("2024-06-15"),
      });
      expect(screen.getByText("Kiinteistönomistajille lähetetään tieto uudesta kuulutuksesta")).toBeInTheDocument();
      expect(screen.getByText("Kiinteistönomistajille ei lähetetä tietoa uudesta kuulutuksesta")).toBeInTheDocument();
    });

    it("ei näytä radiobuttoneita kun kuulutuspäivä on tulevaisuudessa", () => {
      mockSuomifiEnabled(true);
      renderComponent({
        vaihe: Vaihe.NAHTAVILLAOLO,
        uudelleenKuulutus: createUudelleenKuulutus(FUTURE_DATE),
      });
      expect(screen.queryByText("Kiinteistönomistajille lähetetään tieto uudesta kuulutuksesta")).not.toBeInTheDocument();
      expect(screen.queryByText("Kiinteistönomistajille ei lähetetä tietoa uudesta kuulutuksesta")).not.toBeInTheDocument();
    });

    it("näyttää tarkasta-tekstin kun tiedotaKiinteistonomistajia on true", () => {
      mockSuomifiEnabled(true);
      renderComponent(
        {
          vaihe: Vaihe.NAHTAVILLAOLO,
          uudelleenKuulutus: createUudelleenKuulutus(PAST_DATE),
        },
        { nahtavillaoloVaihe: { uudelleenKuulutus: { tiedotaKiinteistonomistajia: true } } }
      );
      expect(screen.getByText(/Tarkasta kiinteistönomistajien vastaanottajalista/)).toBeInTheDocument();
    });

    it("näyttää ei-lähetetä-tekstin kun tiedotaKiinteistonomistajia on false", () => {
      mockSuomifiEnabled(true);
      renderComponent(
        {
          vaihe: Vaihe.NAHTAVILLAOLO,
          uudelleenKuulutus: createUudelleenKuulutus(PAST_DATE),
        },
        { nahtavillaoloVaihe: { uudelleenKuulutus: { tiedotaKiinteistonomistajia: false } } }
      );
      expect(screen.getByText("Kiinteistönomistajille ei lähetetä tietoa uudelleenkuulutuksesta.")).toBeInTheDocument();
    });
  });

  describe("HYVAKSYMISPAATOS-vaihe", () => {
    it("näyttää radiobuttonit kun kuulutuspäivä on tänään", () => {
      mockSuomifiEnabled(true);
      renderComponent({
        vaihe: Vaihe.HYVAKSYMISPAATOS,
        uudelleenKuulutus: createUudelleenKuulutus("2024-06-15"),
      });
      expect(screen.getByText("Kiinteistönomistajille ja muistuttajille lähetetään tieto uudesta kuulutuksesta")).toBeInTheDocument();
      expect(screen.getByText("Kiinteistönomistajille ja muistuttajille ei lähetetä tietoa uudesta kuulutuksesta")).toBeInTheDocument();
    });

    it("ei näytä radiobuttoneita kun kuulutuspäivä on menneisyydessä", () => {
      mockSuomifiEnabled(true);
      renderComponent({
        vaihe: Vaihe.HYVAKSYMISPAATOS,
        uudelleenKuulutus: createUudelleenKuulutus(PAST_DATE),
      });
      expect(screen.queryByText("Kiinteistönomistajille ja muistuttajille lähetetään tieto uudesta kuulutuksesta")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Kiinteistönomistajille ja muistuttajille ei lähetetä tietoa uudesta kuulutuksesta")
      ).not.toBeInTheDocument();
    });

    it("ei näytä radiobuttoneita kun kuulutuspäivä on tulevaisuudessa", () => {
      mockSuomifiEnabled(true);
      renderComponent({
        vaihe: Vaihe.HYVAKSYMISPAATOS,
        uudelleenKuulutus: createUudelleenKuulutus(FUTURE_DATE),
      });
      expect(screen.queryByText("Kiinteistönomistajille ja muistuttajille lähetetään tieto uudesta kuulutuksesta")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Kiinteistönomistajille ja muistuttajille ei lähetetä tietoa uudesta kuulutuksesta")
      ).not.toBeInTheDocument();
    });

    it("näyttää tarkasta-tekstin kun tiedotaKiinteistonomistajia on true", () => {
      mockSuomifiEnabled(true);
      renderComponent(
        {
          vaihe: Vaihe.HYVAKSYMISPAATOS,
          uudelleenKuulutus: createUudelleenKuulutus("2024-06-15"),
        },
        { paatos: { uudelleenKuulutus: { tiedotaKiinteistonomistajia: true } } }
      );
      expect(screen.getByText(/Tarkasta kiinteistönomistajien ja muistuttajien vastaanottajalista/)).toBeInTheDocument();
    });

    it("näyttää ei-lähetetä-tekstin kun tiedotaKiinteistonomistajia on false", () => {
      mockSuomifiEnabled(true);
      renderComponent(
        {
          vaihe: Vaihe.HYVAKSYMISPAATOS,
          uudelleenKuulutus: createUudelleenKuulutus("2024-06-15"),
        },
        { paatos: { uudelleenKuulutus: { tiedotaKiinteistonomistajia: false } } }
      );
      expect(screen.getByText("Kiinteistönomistajille ja muistuttajille ei lähetetä tietoa uudelleenkuulutuksesta.")).toBeInTheDocument();
    });
  });
});
