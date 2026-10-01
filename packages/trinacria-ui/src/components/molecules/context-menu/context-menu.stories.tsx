import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Panel } from "../../primitives/panel/panel.js";
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from "./context-menu.js";

const meta = { title: "Actions/ContextMenu", component: ContextMenu } satisfies Meta<
  typeof ContextMenu
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FileActions: Story = { render: () => <Example /> };
function Example() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <Panel
        tabIndex={0}
        className="p-8"
        onContextMenu={(event) => {
          event.preventDefault();
          setPosition({ x: event.clientX, y: event.clientY });
        }}
        onKeyDown={(event) => {
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.bottom });
          }
        }}
      >
        Tasto destro oppure Shift+F10 per le azioni del file.
      </Panel>
      {position ? (
        <ContextMenu {...position} label="Azioni file" onClose={() => setPosition(null)}>
          <ContextMenuItem icon="eye">Apri</ContextMenuItem>
          <ContextMenuItem disabled icon="pencil">
            Rinomina
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem tone="danger" icon="trash-2">
            Elimina
          </ContextMenuItem>
        </ContextMenu>
      ) : null}
    </>
  );
}
