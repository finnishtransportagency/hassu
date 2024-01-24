import { SaameKieli } from "../../../../database/model";

export async function forEverySaameDoAsync(func: (kieli: SaameKieli) => Promise<void>): Promise<void> {
  for (const saame in SaameKieli) {
    await func(saame as SaameKieli);
  }
}
