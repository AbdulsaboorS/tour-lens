import { useEffect, useRef, useState, type RefObject } from "react";

export type Room = { id: string; label: string; suggestions: string[] };

export const rooms: Room[] = [
  { id: "washer", label: "Laundry", suggestions: ["What kind of washer is this? Can I use pods?"] },
  { id: "window", label: "Window", suggestions: ["What's the view like? Is there a unit with a better one?"] },
  {
    id: "living-room",
    label: "Living room",
    suggestions: ["Does this furniture come with it? How big is this room?", "I love it. Can you hold it for me?"],
  },
  { id: "desk", label: "Dining area", suggestions: ["Could I work from home here?"] },
];

// Zoomed past cover so there's room to look around in both directions.
const ZOOM = 1.35;

type View = { scale: number; x: number; y: number };

/**
 * Stands in for the live camera on the sample tour: the room photo fills the screen and dragging
 * pans it like moving a phone. Whatever is in frame is what gets sent, same as the camera.
 * Key it by room so each room starts centered.
 */
export function Walk({ room, grab }: { room: Room; grab: RefObject<(() => string) | undefined> }) {
  const frame = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number }>(undefined);
  const [view, setView] = useState<View>();
  const [moved, setMoved] = useState(false);

  function bounds() {
    const box = frame.current?.getBoundingClientRect();
    const image = photo.current;

    if (!box || !image?.naturalWidth) return undefined;

    const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight) * ZOOM;

    return { box, scale, minX: box.width - image.naturalWidth * scale, minY: box.height - image.naturalHeight * scale };
  }

  function center() {
    const fit = bounds();

    if (fit) setView({ scale: fit.scale, x: fit.minX / 2, y: fit.minY / 2 });
  }

  useEffect(() => {
    grab.current = () => {
      const fit = bounds();
      const image = photo.current;

      if (!fit || !image || !view) return "";

      const canvas = document.createElement("canvas");
      const source = { x: -view.x / view.scale, y: -view.y / view.scale, w: fit.box.width / view.scale, h: fit.box.height / view.scale };

      canvas.width = 512;
      canvas.height = Math.round((512 * source.h) / source.w);
      canvas.getContext("2d")?.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL("image/jpeg", 0.75);
    };
  });

  function move(event: React.PointerEvent) {
    const fit = bounds();

    if (!drag.current || !fit || !view) return;

    const x = Math.min(0, Math.max(fit.minX, view.x + event.clientX - drag.current.x));
    const y = Math.min(0, Math.max(fit.minY, view.y + event.clientY - drag.current.y));

    drag.current = { x: event.clientX, y: event.clientY };
    setView({ ...view, x, y });
    setMoved(true);
  }

  return (
    <div
      ref={frame}
      className="camera walk"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={move}
      onPointerUp={() => (drag.current = undefined)}
    >
      <img
        ref={photo}
        src={`/rooms/${room.id}.jpg`}
        alt={room.label}
        draggable={false}
        onLoad={center}
        style={
          view && photo.current
            ? { width: photo.current.naturalWidth * view.scale, translate: `${view.x}px ${view.y}px` }
            : { visibility: "hidden" }
        }
      />
      {!moved && <p className="hint">Drag to look around</p>}
    </div>
  );
}
