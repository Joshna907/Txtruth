"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  Coins,
  Copy,
  Lightning,
  SpinnerGap,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import { address, lamports } from "@solana/kit";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
} from "@solana/kit-plugin-wallet/react";
import { devnetClient } from "@/lib/solana-client";
import { certaintyLabel, feeLabel, outcomeMeta, retryLabel } from "@/lib/presentation";
import type { TxTruthPresentation } from "@txtruth/core";

type JsonPresentation = Omit<TxTruthPresentation, "feeLamports"> & { feeLamports?: string };

const MINIMUM_DEMO_BALANCE = 10_000n;
const AIRDROP_AMOUNT = 1_000_000_000n;
const LAST_SIGNATURE_STORAGE_KEY = "txtruth:last-devnet-signature";

type StoredSignature = {
  walletAddress: string;
  signature: string;
};

function formatSol(value: bigint): string {
  const whole = value / AIRDROP_AMOUNT;
  const fraction = (value % AIRDROP_AMOUNT).toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} SOL`;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/reject|declin|cancel/i.test(error.message)) {
      return "The wallet request was cancelled. Nothing new was submitted.";
    }
    return error.message;
  }
  return "The Devnet request could not be completed.";
}

export function DevnetTransactionPanel() {
  const wallets = useWallets(devnetClient);
  const connected = useConnectedWallet(devnetClient);
  const connect = useConnect(devnetClient);
  const disconnect = useDisconnect(devnetClient);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JsonPresentation | null>(null);
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const walletAddress = useMemo(
    () => connected ? address(connected.account.address) : null,
    [connected],
  );

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingBalance(true);
    try {
      const response = await devnetClient.rpc.getBalance(walletAddress, { commitment: "confirmed" }).send();
      setBalance(response.value);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    setBalance(null);
    setResult(null);
    setError(null);
    if (!walletAddress) {
      setSubmittedSignature(null);
      return;
    }
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(LAST_SIGNATURE_STORAGE_KEY) ?? "null",
      ) as Partial<StoredSignature> | null;
      setSubmittedSignature(
        saved?.walletAddress === walletAddress && typeof saved.signature === "string"
          ? saved.signature
          : null,
      );
    } catch {
      setSubmittedSignature(null);
    }
    void refreshBalance();
  }, [refreshBalance, walletAddress]);

  const hasEnoughBalance = balance !== null && balance >= MINIMUM_DEMO_BALANCE;
  const walletLabel = useMemo(
    () => connected ? shortAddress(connected.account.address) : "No wallet connected",
    [connected],
  );

  const requestAirdrop = async () => {
    if (!walletAddress) return;
    setAirdropping(true);
    setError(null);
    try {
      await devnetClient.airdrop(walletAddress, lamports(AIRDROP_AMOUNT));
      await refreshBalance();
    } catch (reason) {
      setError(`${errorMessage(reason)} Use the Devnet Faucet if this public RPC is rate-limited.`);
    } finally {
      setAirdropping(false);
    }
  };

  const connectWallet = async (wallet: (typeof wallets)[number]) => {
    setError(null);
    try {
      await connect.dispatchAsync(wallet);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const disconnectWallet = async () => {
    setError(null);
    try {
      await disconnect.dispatchAsync();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const inspect = async (signature: string): Promise<JsonPresentation> => {
    const response = await fetch("/api/inspect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signature, cluster: "devnet" }),
    });
    const body = (await response.json()) as { error?: string; presentation?: JsonPresentation };
    if (!response.ok || !body.presentation) throw new Error(body.error ?? "The transaction could not be inspected.");
    return body.presentation;
  };

  const sendSelfTransfer = async () => {
    if (!connected?.signer || !walletAddress || !hasEnoughBalance) return;
    setSending(true);
    setError(null);
    setResult(null);
    setSubmittedSignature(null);
    window.localStorage.removeItem(LAST_SIGNATURE_STORAGE_KEY);
    try {
      const transaction = devnetClient.system.instructions.transferSol({
        source: connected.signer,
        destination: walletAddress,
        amount: 1n,
      });
      const sent = await transaction.sendTransaction();
      const signature = String(sent.context.signature);
      setSubmittedSignature(signature);
      window.localStorage.setItem(
        LAST_SIGNATURE_STORAGE_KEY,
        JSON.stringify({ walletAddress, signature } satisfies StoredSignature),
      );
      let inspection: JsonPresentation | null = null;
      let inspectionError: unknown = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          inspection = await inspect(signature);
          inspectionError = null;
          if (inspection.outcome !== "in_progress" && inspection.outcome !== "indeterminate") {
            break;
          }
        } catch (reason) {
          inspectionError = reason;
        }
        if (attempt < 7) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
      }
      if (inspection) {
        setResult(inspection);
      } else {
        setError(
          `Transaction submitted, but evidence lookup is temporarily unavailable. Verify the preserved signature on Devnet Explorer. ${errorMessage(inspectionError)}`,
        );
      }
      await refreshBalance();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="devnet-transaction" aria-labelledby="devnet-transaction-title">
      <div className="devnet-transaction-copy">
        <span>Live Devnet proof</span>
        <h2 id="devnet-transaction-title">Send and independently verify a wallet transaction</h2>
        <p>Solana Kit sends a fixed self-transfer, then TxTruth verifies the returned signature. One lamport returns to your wallet; only free Devnet SOL is used for the fee.</p>
      </div>

      <div className="wallet-console" aria-live="polite" aria-busy={connect.isRunning || airdropping || sending || loadingBalance}>
        <div className="wallet-status">
          <Wallet aria-hidden="true" size={23} weight="duotone" />
          <div><span>Wallet</span><strong>{walletLabel}</strong></div>
          {connected && <button className="text-action" type="button" onClick={() => void disconnectWallet()} disabled={disconnect.isRunning}>Disconnect</button>}
        </div>

        {!connected && (
          <div className="wallet-picker">
            {wallets.length > 0 ? wallets.map((wallet) => (
              <button key={wallet.name} type="button" onClick={() => void connectWallet(wallet)} disabled={connect.isRunning}>
                <Wallet aria-hidden="true" size={16} /> {connect.isRunning ? "Connecting…" : `Connect ${wallet.name}`}
              </button>
            )) : <p><WarningCircle size={17} /> Install or unlock a Wallet Standard wallet such as Phantom or Solflare, then refresh this page.</p>}
          </div>
        )}

        {connected && (
          <div className="devnet-actions">
            <div className="balance-readout">
              <Coins aria-hidden="true" size={18} weight="duotone" />
              <span>Devnet balance</span>
              <strong>{loadingBalance || balance === null ? "Checking…" : formatSol(balance)}</strong>
              <button className="text-action" type="button" onClick={() => void refreshBalance()} disabled={loadingBalance}>Refresh</button>
            </div>
            <div className="devnet-action-buttons">
              <button type="button" onClick={requestAirdrop} disabled={airdropping}>
                {airdropping ? <SpinnerGap aria-hidden="true" className="spin" size={16} /> : <Coins aria-hidden="true" size={16} />}
                {airdropping ? "Requesting Devnet SOL…" : "Request Devnet SOL"}
              </button>
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">Open Devnet Faucet <ArrowSquareOut size={14} /></a>
              <button className="run-live" type="button" onClick={sendSelfTransfer} disabled={!hasEnoughBalance || sending}>
                {sending ? <SpinnerGap aria-hidden="true" className="spin" size={16} /> : <Lightning aria-hidden="true" size={16} weight="fill" />}
                {sending ? "Awaiting wallet and RPC…" : "Run 1-lamport self-transfer"}
              </button>
            </div>
            {!hasEnoughBalance && !loadingBalance && <p className="balance-warning">Request Devnet SOL before running the demonstration. Public airdrops can be rate-limited.</p>}
          </div>
        )}

        {submittedSignature && (
          <div className="submitted-signature">
            <span>Latest live Devnet signature</span>
            <code>{submittedSignature.slice(0, 18)}…{submittedSignature.slice(-7)}</code>
            <button
              type="button"
              aria-label="Copy submitted transaction signature"
              onClick={() => void navigator.clipboard.writeText(submittedSignature).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1_400);
              })}
            >
              <Copy aria-hidden="true" size={15} /> {copied ? "Copied" : "Copy"}
            </button>
            <a href={`https://explorer.solana.com/tx/${submittedSignature}?cluster=devnet`} target="_blank" rel="noreferrer">
              Verify <ArrowSquareOut aria-hidden="true" size={14} />
            </a>
          </div>
        )}
        {error && <p className="live-error"><WarningCircle aria-hidden="true" size={18} /> {error}</p>}
        {result && (() => {
          const meta = outcomeMeta(result.outcome);
          return <>
            <div className={`live-verdict tone-${meta.tone}`}>
              <div><span>{meta.label}</span><strong>{result.title}</strong><p>{result.message}</p></div>
              <dl>
                <div><dt>Certainty</dt><dd>{certaintyLabel(result.certainty, result.outcome)}</dd></div>
                <div><dt>Fee</dt><dd>{result.feeLamports ? formatSol(BigInt(result.feeLamports)) : feeLabel(result.feeImpact)}</dd></div>
                <div><dt>Retry</dt><dd>{retryLabel(result.retryPolicy)}</dd></div>
              </dl>
              {result.explorerUrl && <a href={result.explorerUrl} target="_blank" rel="noreferrer">Verify on Devnet Explorer <ArrowSquareOut aria-hidden="true" size={15} /></a>}
            </div>
            <section className="live-evidence" aria-label="Live Devnet inspection evidence">
              <div className="live-evidence-heading">
                <span>Evidence timeline</span>
                <small>Independent Devnet inspection after submission</small>
              </div>
              <ol>
                {result.evidence.map((item, index) => (
                  <li key={`${item.event}-${index}`}>
                    <span className="live-evidence-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <code>{item.event.replaceAll("_", " ")}</code>
                      <p>{item.summary}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>;
        })()}
      </div>
    </section>
  );
}
