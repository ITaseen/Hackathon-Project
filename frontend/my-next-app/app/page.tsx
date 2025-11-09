import Head from "next/head";
import Pomodoro from "./Components/Pomodoro";

export default function page() {
  return (
    <>
      <Head>
        <title>Pomodoro Timer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen flex items-center justify-center p-6">
        <Pomodoro />
      </main>
    </>
  );
}