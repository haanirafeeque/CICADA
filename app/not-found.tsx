import Link from "next/link";
import { Frame } from "@/components/Frame";

export default function NotFound() {
  return (
    <Frame label="NO SIGNAL">
      <span className="micro-label">404 · NOT FOUND</span>
      <h1 className="page-title">This path is quiet.</h1>
      <p className="page-lede">The page you are looking for could not be found.</p>
      <Link className="button button--start" href="/">RETURN HOME <span aria-hidden="true">↗</span></Link>
    </Frame>
  );
}
