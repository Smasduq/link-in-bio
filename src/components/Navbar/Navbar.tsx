import Link from "next/link";
import styles from "./Navbar.module.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Navbar() {
  const session = await getServerSession(authOptions);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.icon}>L</div>
          <span>LinkBio</span>
        </Link>
        
        <div className={styles.links}>
          {session ? (
            <Link href="/dashboard" className="premium-button">Dashboard</Link>
          ) : (
            <>
              <Link href="/sign-in" className={styles.login}>Sign In</Link>
              <Link href="/sign-up" className="premium-button">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger (Checkbox Hack) */}
        <input type="checkbox" id="nav-toggle" className={styles.toggle} />
        <label htmlFor="nav-toggle" className={styles.burger}>
          <span></span>
          <span></span>
          <span></span>
        </label>
      </div>
    </nav>
  );
}
