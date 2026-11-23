"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap">
      <h1>Something went wrong.</h1>
      <p>Dogoggorri uumameera.</p>
      <p>ችግር ተፈጥሯል።</p>
      <button className="btn primary" type="button" onClick={() => reset()}>Try again</button>
    </main>
  );
}
