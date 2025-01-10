import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

export const useAikavalidointi = (index: number) => {
  const { watch, trigger } = useFormContext();
  
  const alkamisAika = watch(`vuorovaikutusTilaisuudet.${index}.alkamisAika`);
  const paattymisAika = watch(`vuorovaikutusTilaisuudet.${index}.paattymisAika`);

  useEffect(() => {
    if (alkamisAika || paattymisAika) {
      trigger(`vuorovaikutusTilaisuudet.${index}.alkamisAika`);
      trigger(`vuorovaikutusTilaisuudet.${index}.paattymisAika`);
    }
  }, [alkamisAika, paattymisAika, trigger, index]);
};