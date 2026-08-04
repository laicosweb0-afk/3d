import { Ingresso } from '@/components/bufala/Ingresso';
import { Journey } from '@/components/bufala/Journey';
import { Sections } from '@/components/bufala/Sections';
import { Nav } from '@/components/bufala/Nav';

export default function BufalaPage() {
  return (
    <>
      <span id="top" />
      <Nav />
      {/* L'ingresso sta nel flusso, prima del palco: scorrendo si alza come
          un sipario e scopre il film. Il progresso del viaggio si misura
          dallo spacer, quindi non si sposta di una riga. */}
      <Ingresso />
      <Journey />
      <Sections />
    </>
  );
}
