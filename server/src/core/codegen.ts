// Code skeletons. Fail-closed, secrets from configuration, no card data. Parts that depend on an API
// surface not publicly documented are left as clearly marked TODOs instead of guessed code.

type Lang = "kotlin" | "java" | "dart" | "typescript" | "python" | "csharp" | "go";
interface Template { title: string; language: Lang; notes: string[]; code: string }

const T: Record<string, Partial<Record<Lang, Template>>> = {
  "android-age-gate": {
    kotlin: {
      title: "Age gate before payment (Voltox Age Verification SDK 1.0.15 + wallee ATI)",
      language: "kotlin",
      notes: [
        "Fail closed: only RESULT_OK && isVerified == true continues.",
        "Initialise once at app start for speed; pass requiredAge per product on start().",
        "The wallee ATI call is a TODO: use the exact method signature of your android-till-sdk version.",
      ],
      code: `class CheckoutActivity : AppCompatActivity() {

    private var pendingSale: Sale? = null

    private val ageGate = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val sale = pendingSale ?: return@registerForActivityResult
        pendingSale = null
        val verified = result.resultCode == Activity.RESULT_OK &&
            result.data?.getBooleanExtra("isVerified", false) == true   // fail closed
        if (!verified) {
            val reason = result.data?.getStringExtra("reason")          // logs/operator only
            showDenied(reason)
            return@registerForActivityResult
        }
        startWalleePayment(sale)                                        // payment gate next
    }

    fun sellRestricted(sale: Sale) {
        pendingSale = sale
        VoltoxAgeVerification.start(
            context = this,
            launcher = ageGate,
            requiredAge = sale.requiredAge                              // 16, 18, 21 … per product
        )
    }

    private fun startWalleePayment(sale: Sale) {
        // TODO wallee Android Till SDK (ATI): authorise a purchase for sale.amount with a unique
        // reference (sale.reference). Bind ApiClient once at app start; handle the result in the
        // ResponseHandler. Release goods ONLY on an approved result. See wallee-terminal-ep2 skill.
    }
}

// Application.onCreate(): initialise once
// val options = VoltoxOptions.Builder().apply {
//     developerModeEnabled = false                        // never true in release
//     uiMode = UiMode.ScanFaceAndQrCode
//     scanIdOption = ScanIdOption.ScanIdAndNfc
//     deviceType = DeviceType.Terminal
// }.build()
// VoltoxAgeVerification.initialize(secureConfig.voltoxClientId, secureConfig.voltoxClientSecret, options)`,
    },
    java: {
      title: "Age gate result handling (Java)",
      language: "java",
      notes: ["Fail closed.", "Pass requiredAge per flow (last argument)."],
      code: `private final ActivityResultLauncher<Intent> ageGate = registerForActivityResult(
    new ActivityResultContracts.StartActivityForResult(), result -> {
        Intent data = result.getData();
        boolean verified = result.getResultCode() == Activity.RESULT_OK
            && data != null && data.getBooleanExtra("isVerified", false);   // fail closed
        if (!verified) { showDenied(data != null ? data.getStringExtra("reason") : null); return; }
        startWalleePayment(pendingSale);                                    // TODO ATI, see skill
    });

void sellRestricted(Sale sale) {
    pendingSale = sale;
    VoltoxAgeVerification.INSTANCE.start(this, ageGate, null, null, sale.requiredAge);
}`,
    },
  },
  "android-smile-and-pay": {
    kotlin: {
      title: "Smile & Pay checkout with exactly-once fulfilment",
      language: "kotlin",
      notes: ["Engine created once in Application.onCreate and cached as 'smile_and_pay'.", "amountMinorUnits ≥ 500.", "Fulfil only on onPaid, idempotent on paymentIntentId/appPaymentId."],
      code: `class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val engine = FlutterEngine(this)
        engine.dartExecutor.executeDartEntrypoint(DartExecutor.DartEntrypoint.createDefault())
        FlutterEngineCache.getInstance().put("smile_and_pay", engine)
    }
}

class CheckoutActivity : AppCompatActivity() {
    private val channel by lazy {
        val engine = FlutterEngineCache.getInstance().get("smile_and_pay")!!
        MethodChannel(engine.dartExecutor.binaryMessenger, "ai.voltox.smile_and_pay")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        channel.setMethodCallHandler { call, result ->
            if (call.method != "onPaid") { result.notImplemented(); return@setMethodCallHandler }
            val reference = call.argument<String?>("appPaymentId") ?: call.argument<String>("paymentIntentId")!!
            val amount = call.argument<Int>("amountMinorUnits")!!
            val currency = call.argument<String>("currency")!!
            orders.fulfilOnce(reference, amount, currency)   // unique constraint on reference
            startActivity(Intent(this, CheckoutActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP))
            result.success(null)
        }
    }

    fun payBySmile(amountMinorUnits: Int, currency: String) {
        require(amountMinorUnits >= 500) { "Smile & Pay minimum is 5.00" }
        channel.invokeMethod("start", mapOf(
            "clientId" to secureConfig.voltoxMerchantClientId,
            "amountMinorUnits" to amountMinorUnits,
            "currency" to currency,              // CHF, EUR or USD
            "developerMode" to false
        ))
        startActivity(FlutterActivity.withCachedEngine("smile_and_pay").build(this))
    }
}`,
    },
  },
  "flutter-smile-and-pay": {
    dart: {
      title: "Smile & Pay in Flutter",
      language: "dart",
      notes: ["Fulfil only on SmileAndPayPaid.", "Minimum 5.00."],
      code: `void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SmileAndPay.initialize(SmileAndPayConfig(clientId: Config.voltoxMerchantClientId));
  runApp(const MaterialApp(home: CheckoutPage()));
}

class CheckoutPage extends StatelessWidget {
  const CheckoutPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SmileAndPayFlow(
          amount: const Money(minorUnits: 1560, currencyCode: 'CHF'),
          onResult: (result) {
            if (result is SmileAndPayPaid) {
              Orders.fulfilOnce(result.paymentIntentId, result.amount); // exactly once
            }
            // every other result: nothing is fulfilled (fail closed)
          },
        ),
      );
}`,
    },
  },
  "wallee-jwt": {
    typescript: {
      title: "wallee API v2.0 request with per-request JWT (Node.js)",
      language: "typescript",
      notes: ["New JWT for every request (iat, requestPath incl. query, requestMethod).", "Key from vault; base64-decoded as HMAC key.", "Prefer the official wallee SDK where available; this shows the mechanism.", "Verify sub type (string/number) against the wallee API reference of your SDK version."],
      code: `import { createHmac } from "node:crypto";

const BASE = "https://app-wallee.com";
const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

export function walleeJwt(userId: number, authKeyBase64: string, method: string, pathWithQuery: string): string {
  const header = { alg: "HS256", typ: "JWT", ver: 1 };
  const payload = { sub: String(userId), iat: Math.floor(Date.now() / 1000), requestPath: pathWithQuery, requestMethod: method.toUpperCase() };
  const data = \`\${b64url(JSON.stringify(header))}.\${b64url(JSON.stringify(payload))}\`;
  const sig = createHmac("sha256", Buffer.from(authKeyBase64, "base64")).update(data).digest("base64url");
  return \`\${data}.\${sig}\`;
}

export async function walleeCall<T>(method: string, pathWithQuery: string, spaceId: number, body?: unknown): Promise<T> {
  const { userId, authKey } = await vault.get("wallee/application-user");          // never from code
  const res = await fetch(BASE + pathWithQuery, {
    method,
    headers: {
      Authorization: \`Bearer \${walleeJwt(userId, authKey, method, pathWithQuery)}\`,
      space: String(spaceId),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(\`wallee \${method} \${pathWithQuery} → \${res.status}\`);   // no body/secret in logs
  return (await res.json()) as T;
}

// usage: walleeCall("GET", \`/api/v2.0/payment/transactions/\${id}\`, spaceId)`,
    },
    python: {
      title: "wallee API v2.0 JWT (Python)",
      language: "python",
      notes: ["New JWT per request.", "Key from vault."],
      code: `import base64, hashlib, hmac, json, time

def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def wallee_jwt(user_id: int, auth_key_b64: str, method: str, path_with_query: str) -> str:
    header = {"alg": "HS256", "typ": "JWT", "ver": 1}
    payload = {"sub": str(user_id), "iat": int(time.time()),
               "requestPath": path_with_query, "requestMethod": method.upper()}
    data = f"{_b64url(json.dumps(header, separators=(',', ':')).encode())}." \\
           f"{_b64url(json.dumps(payload, separators=(',', ':')).encode())}"
    sig = hmac.new(base64.b64decode(auth_key_b64), data.encode(), hashlib.sha256).digest()
    return f"{data}.{_b64url(sig)}"

# headers = {"Authorization": f"Bearer {wallee_jwt(uid, key, 'GET', path)}", "space": str(space_id)}`,
    },
    csharp: {
      title: "wallee API v2.0 JWT (C#)",
      language: "csharp",
      notes: ["New JWT per request.", "Key from a secret store."],
      code: `using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

static string B64Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

public static string WalleeJwt(long userId, string authKeyBase64, string method, string pathWithQuery)
{
    var header = JsonSerializer.SerializeToUtf8Bytes(new { alg = "HS256", typ = "JWT", ver = 1 });
    var payload = JsonSerializer.SerializeToUtf8Bytes(new {
        sub = userId.ToString(), iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
        requestPath = pathWithQuery, requestMethod = method.ToUpperInvariant() });
    var data = $"{B64Url(header)}.{B64Url(payload)}";
    using var h = new HMACSHA256(Convert.FromBase64String(authKeyBase64));
    return $"{data}.{B64Url(h.ComputeHash(Encoding.ASCII.GetBytes(data)))}";
}`,
    },
  },
  "wallee-webhook": {
    typescript: {
      title: "wallee webhook: verify x-signature, then read the entity",
      language: "typescript",
      notes: [
        "Preferred: the signature check method of the official wallee SDK for your language.",
        "Manual fallback: the public key is fetched by keyId via the Webhook Encryption Service (read). Confirm the key encoding in the API reference; the code assumes base64 X.509/SPKI DER.",
        "Always read the entity by entityId before changing order state; process idempotently by eventId.",
      ],
      code: `import { verify } from "node:crypto";
import express from "express";

const app = express();
app.post("/webhooks/wallee", express.raw({ type: "*/*" }), async (req, res) => {
  const header = req.header("x-signature") ?? "";
  // format: algorithm=SHA256withECDSA, keyId=<uuid>, signature=<base64>
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split(/=(.*)/s).slice(0, 2)));
  if (parts.algorithm !== "SHA256withECDSA" || !parts.keyId || !parts.signature) return res.sendStatus(401);

  const publicKeyB64 = await keyCache.get(parts.keyId);   // read via wallee Webhook Encryption Service, cache
  const ok = verify("sha256", req.body,
    { key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" },
    Buffer.from(parts.signature, "base64"));
  if (!ok) return res.sendStatus(401);

  const event = JSON.parse(req.body.toString("utf8"));
  res.sendStatus(200);                                     // acknowledge fast
  await queue.push({                                       // process async + idempotent
    eventId: event.eventId, entityId: event.entityId, spaceId: event.spaceId,
    entity: event.listenerEntityTechnicalName,
  });
});

// worker: if (await processed.has(eventId)) return;
//         const tx = await walleeCall("GET", \`/api/v2.0/payment/transactions/\${entityId}\`, spaceId);
//         if (tx.state === "FULFILL" || tx.state === "COMPLETED") await orders.fulfilOnce(tx.id);`,
    },
  },
  "lti-client": {
    typescript: {
      title: "wallee LTI connection (framing, persistent socket, recovery)",
      language: "typescript",
      notes: [
        "Till is the client; default port 50000; 4-byte big-endian length + XML (namespace vcs-pos).",
        "Build message XML strictly from the LTI XML schemas of your LTI version (not shown here).",
        "Send a unique merchantReference; on reconnect recover the last transaction before any new payment.",
        "Only inside a protected LAN segment.",
      ],
      code: `import net from "node:net";

export class LtiConnection {
  private socket?: net.Socket;
  private buf = Buffer.alloc(0);
  constructor(private host: string, private port = 50000, private onMessage: (xml: string) => void) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = net.createConnection({ host: this.host, port: this.port }, () => resolve());
      s.setKeepAlive(true, 10_000);
      s.setNoDelay(true);
      s.on("data", (d) => this.onData(d));
      s.on("error", reject);
      s.on("close", () => this.onClose());
      this.socket = s;
    });
  }

  send(xml: string) {
    const body = Buffer.from(xml, "utf8");
    const header = Buffer.alloc(4);
    header.writeUInt32BE(body.length, 0);                 // 4-byte big-endian length
    this.socket!.write(Buffer.concat([header, body]));
  }

  private onData(d: Buffer) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0);
      if (this.buf.length < 4 + len) break;
      this.onMessage(this.buf.subarray(4, 4 + len).toString("utf8"));
      this.buf = this.buf.subarray(4 + len);
    }
  }

  private onClose() {
    // reconnect with backoff, then RECOVER: determine last transaction (trxSyncNumber / last trx data)
    // and book or reverse it BEFORE accepting a new payment (R-076, T-040).
  }
}`,
    },
  },
  "idempotent-fulfilment": {
    typescript: {
      title: "Exactly-once fulfilment (database constraint)",
      language: "typescript",
      notes: ["Unique constraint on the payment reference; webhook, redirect and SDK callback can race safely."],
      code: `// SQL
// CREATE TABLE fulfilments (
//   payment_reference TEXT PRIMARY KEY,      -- wallee transaction id / Smile & Pay paymentIntentId|appPaymentId
//   order_id          TEXT NOT NULL UNIQUE,
//   amount_minor      INTEGER NOT NULL,
//   currency          CHAR(3) NOT NULL,
//   created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
// );

export async function fulfilOnce(db: Db, ref: string, orderId: string, amountMinor: number, currency: string) {
  const inserted = await db.query(
    "INSERT INTO fulfilments(payment_reference, order_id, amount_minor, currency) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING 1",
    [ref, orderId, amountMinor, currency]);
  if (inserted.rowCount === 0) return "already-fulfilled";
  await releaseGoods(orderId);   // after the row exists; release must itself be idempotent
  return "fulfilled";
}`,
    },
  },
};

export const CODE_TARGETS = Object.keys(T);

export function generate(target: string, language?: string) {
  const byLang = T[target];
  if (!byLang) return { error: `Unknown target. Available: ${CODE_TARGETS.join(", ")}` };
  const langs = Object.keys(byLang);
  const tpl = (language && byLang[language as Lang]) || byLang[langs[0] as Lang]!;
  const fallback = language && !byLang[language as Lang] ? `No ${language} template for ${target}; returning ${tpl.language}. Available: ${langs.join(", ")}.` : undefined;
  return { target, ...tpl, availableLanguages: langs, fallback };
}
