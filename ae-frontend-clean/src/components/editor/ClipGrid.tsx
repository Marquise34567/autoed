import Image from "next/image";
import { GeneratedClip } from "@/lib/types";

type ClipGridProps = {
  clips: GeneratedClip[];
  onUseFinal: (clip: GeneratedClip) => void;
  onDownload: (clip: GeneratedClip) => void;
};

export default function ClipGrid({
  clips,
  onUseFinal,
  onDownload,
}: ClipGridProps) {
  // Generated Clips UI removed per design requirement.
  return null
}
