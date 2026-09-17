import { AureaLogo } from './AureaLogo';
import { ProgressBar } from './ProgressBar';
import { MuteButton } from './MuteButton';

type Props = {
  passo: number;
  totale: number;
  mostraContatore?: boolean;
  onIndietro?: () => void;
};

export function Header({ passo, totale, mostraContatore = true, onIndietro }: Props) {
  return (
    <header className="sticky top-0 z-20 vetro" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-[52px] items-center justify-between px-6">
        <div className="flex items-center gap-2">
          {onIndietro && (
            <button
              onClick={onIndietro}
              aria-label="Torna al passaggio precedente"
              className="-ml-2 flex h-11 w-11 items-center justify-center text-ink-soft"
            >
              <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden>
                <path d="M9.5 1.5 2 9l7.5 7.5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <AureaLogo size={22} title="Aurea" />
          <span className="text-callout font-semibold tracking-[-0.01em]">Club Aurea</span>
        </div>
        <div className="flex items-center gap-1">
          {mostraContatore && (
            <span className="text-footnote text-ink-soft tabular">{passo} di {totale}</span>
          )}
          <MuteButton />
        </div>
      </div>
      <ProgressBar passo={passo} totale={totale} />
    </header>
  );
}
