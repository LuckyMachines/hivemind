import React from "react";
import Link from "next/link";
import Head from "next/head";

const settings = require("../settings");

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>{settings.projectTitle} — A Coordination Game Protocol</title>
        <meta
          name="description"
          content="HJIVEMIND is an on-chain coordination game where players compete across majority and minority rounds to outsmart the crowd."
        />
      </Head>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__bg" />
        <div className="landing-hero__content">
          <img
            src="/logo.png"
            alt="HJIVEMIND"
            className="landing-hero__logo"
          />
          <h1 className="hjivemind-title">HJIVEMIND</h1>
          <p className="hjivemind-tagline" style={{ fontSize: "1.4em" }}>
            A coordination game protocol
          </p>
          <Link href="/play">
            <a className="landing-cta">Play Now</a>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-section landing-section--dark">
        <h2 className="landing-section__title">How It Works</h2>
        <div className="landing-steps">
          <div className="landing-steps__card">
            <span className="landing-steps__number">1</span>
            <h3>Join a Lobby</h3>
            <p>Connect your wallet and get matched with other players.</p>
          </div>
          <div className="landing-steps__card">
            <span className="landing-steps__number">2</span>
            <h3>Answer Questions</h3>
            <p>Compete across 4 rounds of multiple-choice questions.</p>
          </div>
          <div className="landing-steps__card">
            <span className="landing-steps__number">3</span>
            <h3>Outsmart the Crowd</h3>
            <p>
              Each round is randomly majority or minority mode — predict the
              crowd to win.
            </p>
          </div>
        </div>
      </section>

      {/* Game Modes */}
      <section className="landing-section landing-section--light">
        <h2 className="landing-section__title">Game Modes</h2>
        <div className="landing-modes">
          <div className="landing-modes__card landing-modes__card--majority">
            <h3>Majority Rounds</h3>
            <p>
              Predict what most players will choose. Align with the crowd to
              score points.
            </p>
          </div>
          <div className="landing-modes__card landing-modes__card--minority">
            <h3>Minority Rounds</h3>
            <p>
              Predict the least popular answer. Coordination backfires — think
              differently to win.
            </p>
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section className="landing-section landing-section--dark">
        <h2 className="landing-section__title">Scoring</h2>
        <div className="landing-scoring">
          <div className="landing-scoring__item">
            <span className="landing-scoring__points">100</span>
            <span className="landing-scoring__label">Submission</span>
            <span className="landing-scoring__desc">
              Points for submitting your answer each round
            </span>
          </div>
          <div className="landing-scoring__item">
            <span className="landing-scoring__points">1,000</span>
            <span className="landing-scoring__label">Fast Reveal Bonus</span>
            <span className="landing-scoring__desc">
              Up to 1,000 points for revealing your answer quickly
            </span>
          </div>
          <div className="landing-scoring__item">
            <span className="landing-scoring__points">3,000</span>
            <span className="landing-scoring__label">Winning Choice</span>
            <span className="landing-scoring__desc">
              Match the winning choice to earn the maximum bonus
            </span>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="landing-section landing-section--light">
        <h2 className="landing-section__title">Built On-Chain</h2>
        <div className="landing-tech">
          <div className="landing-tech__item">
            <strong>Solidity + Foundry</strong>
            <p>Smart contracts deployed on Polygon Mumbai</p>
          </div>
          <div className="landing-tech__item">
            <strong>Chainlink VRF</strong>
            <p>Verifiable randomization for minority/majority round selection</p>
          </div>
          <div className="landing-tech__item">
            <strong>On-Chain Automation</strong>
            <p>Game-state transitions handled automatically by Chainlink Keepers</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <h2 className="hjivemind-title" style={{ fontSize: "1.8em" }}>
          HJIVEMIND
        </h2>
        <p className="hjivemind-tagline">A coordination game protocol</p>
        <Link href="/play">
          <a className="landing-cta landing-cta--small">Play Now</a>
        </Link>
      </footer>
    </>
  );
}
