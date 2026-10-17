import Link from "next/link";
import { Frame } from "@/components/Frame";

export default function ServerErrorRoute() {
  return (
    <Frame label="SIGNAL INTERRUPTED">
      <span className="micro-label">500 · TEMPORARY ERROR</span>
      <h1 className="page-title">Not available right now</h1>
      <p className="page-lede">The signal could not be reached. Try again in a moment.</p>
      <Link className="button button--start" href="/">RETURN HOME <span aria-hidden="true">↗</span></Link>
    </Frame>
  );
}
