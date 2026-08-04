import { Button, Icon, Panel } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import { FileManager, type MediaFileManagerContext } from "./media-file-manager.js";

/** Integration example: the same manager can be embedded as a full-screen picker. */
export function MediaFileManagerModalDemo(context: MediaFileManagerContext) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mx-auto grid max-w-3xl gap-6 py-8 sm:py-14">
      <Panel className="rounded-2xl p-7 sm:p-10" elevation="sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Icon name="folder" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-[color:var(--color-ink)]">
          Selettore media
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-[color:var(--color-ink-muted)]">
          Questo esempio apre il File Manager come modale a tutto schermo. Lo stesso componente può
          quindi essere usato da un editor, da una libreria o da un flusso di inserimento contenuti.
        </p>
        <Button type="button" className="mt-7" onClick={() => setIsOpen(true)}>
          <Icon name="folder-open" className="h-4 w-4" /> Apri File Manager
        </Button>
      </Panel>

      <FileManager
        {...context}
        presentation="modal"
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </section>
  );
}
