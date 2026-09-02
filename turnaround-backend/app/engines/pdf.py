"""
PDF rendering engine using WeasyPrint.
Provides HTML-to-PDF conversion for gate passes and demurrage notices.
"""
import base64
import io
import logging
from typing import Optional

logger = logging.getLogger("turnaround.pdf")

# Brand colours
BRAND_PURPLE = "#250C77"
BRAND_ORANGE = "#ED642B"
DARK_PURPLE  = "#0B0524"


def _qr_png_base64(qr_data: str) -> str:
    """Return a base64-encoded PNG of a QR code for embedding in HTML."""
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color=BRAND_PURPLE, back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        logger.warning(f"QR generation failed: {e}")
        return ""


def _html_to_pdf(html: str) -> bytes:
    """Render HTML string to PDF bytes using WeasyPrint."""
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except ImportError:
        raise RuntimeError(
            "WeasyPrint is not installed. Run: pip install weasyprint>=61.0"
        )


def _field(label: str, value: Optional[str], mono: bool = False) -> str:
    val_style = "font-family:monospace;" if mono else ""
    val_text  = value or "—"
    val_color = "#111" if value else "#aaa"
    return f"""
    <div style="margin-bottom:8px;">
      <div style="font-size:7px;font-weight:700;text-transform:uppercase;
                  letter-spacing:0.12em;color:#888;margin-bottom:2px;">{label}</div>
      <div style="font-size:11px;font-weight:600;color:{val_color};{val_style}">{val_text}</div>
    </div>"""


# ── Gate Pass PDF ─────────────────────────────────────────────────────────────

def render_gate_pass_pdf(gp) -> bytes:
    """
    Render a GatePass ORM object to a PDF document.
    gp must have: pass_number, vehicle_reg, vehicle_type, driver_name,
    driver_phone, driver_license, container_number, customs_seal_number,
    cargo_type, cargo_weight_tonnes, terminal_name, terminal_gate,
    carrier_name, time_window_start, time_window_end, status,
    digital_signature, created_at, issued_by_name (optional).
    """
    status_label = gp.status.value.upper().replace("_", " ")
    status_colors = {
        "pre_approved": ("#FFF7ED", "#D97706", "#FDE68A"),
        "cleared":      ("#ECFDF5", "#059669", "#A7F3D0"),
        "inspected":    ("#EFF6FF", "#2563EB", "#BFDBFE"),
        "expired":      ("#FEF2F2", "#DC2626", "#FECACA"),
        "cancelled":    ("#F9FAFB", "#6B7280", "#E5E7EB"),
    }
    sc = status_colors.get(gp.status.value, status_colors["pre_approved"])
    badge_bg, badge_fg, bar_color = sc

    start_str = gp.time_window_start.strftime("%d %b %Y  %H:%M UTC") if gp.time_window_start else "—"
    end_str   = gp.time_window_end.strftime("%d %b %Y  %H:%M UTC")   if gp.time_window_end   else "—"
    issued_str = gp.created_at.strftime("%d %b %Y") if gp.created_at else "—"

    qr_data = (
        f"PASS:{gp.pass_number}|VEH:{gp.vehicle_reg}"
        f"|TERM:{gp.terminal_name}|UNTIL:{gp.time_window_end.isoformat() if gp.time_window_end else ''}"
        f"|STATUS:{status_label}"
        f"|VERIFY:https://turnaround.africa/verify/{gp.pass_number}"
    )
    qr_b64 = _qr_png_base64(qr_data)
    qr_img  = f'<img src="data:image/png;base64,{qr_b64}" width="96" height="96"/>' if qr_b64 else ""

    weight_str = f"{float(gp.cargo_weight_tonnes)} t" if gp.cargo_weight_tonnes else None
    issuer = getattr(gp, "issued_by_name", None) or "System"

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page {{ size:A4; margin:18mm 16mm; }}
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#111; font-size:11px; }}
  .top-bar {{ height:6px; background:{bar_color}; border-radius:3px 3px 0 0; }}
  .header {{ background:linear-gradient(135deg,{BRAND_PURPLE} 0%,#1a0a5a 100%);
             padding:16px 20px; display:flex; justify-content:space-between; align-items:flex-start; }}
  .header h1 {{ color:#fff; font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-top:4px; }}
  .header .sub {{ color:{BRAND_ORANGE}; font-size:8px; font-weight:700; letter-spacing:0.2em;
                  text-transform:uppercase; margin-bottom:4px; }}
  .header .pass-num {{ color:#fbd38d; font-family:monospace; font-size:11px;
                       font-weight:700; margin-top:6px; letter-spacing:0.08em; }}
  .badge {{ background:{badge_bg}; color:{badge_fg}; border:1px solid {badge_fg}40;
            padding:4px 10px; border-radius:999px; font-size:8px; font-weight:800;
            text-transform:uppercase; letter-spacing:0.12em; }}
  .body {{ padding:16px 20px; }}
  .section-title {{ font-size:7px; font-weight:700; text-transform:uppercase;
                    letter-spacing:0.15em; color:#888; border-bottom:1px solid #eee;
                    padding-bottom:4px; margin-bottom:10px; margin-top:14px; }}
  .grid-2 {{ display:grid; grid-template-columns:1fr 1fr; gap:0 24px; }}
  .grid-3 {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:0 16px; }}
  .qr-block {{ text-align:center; }}
  .qr-block p {{ font-size:7px; font-weight:700; text-transform:uppercase;
                 letter-spacing:0.1em; color:#aaa; margin-top:4px; }}
  .validity {{ background:#f5f3ff; border:1px solid #c4b5fd; border-radius:8px;
               padding:10px 14px; margin-top:14px; display:grid;
               grid-template-columns:1fr 1fr; gap:8px; }}
  .validity .vl {{ font-size:7px; font-weight:700; text-transform:uppercase;
                   letter-spacing:0.1em; color:#7c3aed; margin-bottom:3px; }}
  .validity .vv {{ font-family:monospace; font-size:10px; font-weight:700; color:#3b0764; }}
  .sig-row {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }}
  .sig-box {{ border:1px solid #e5e7eb; border-radius:6px; padding:8px; min-height:56px; }}
  .sig-box.dashed {{ border-style:dashed; }}
  .sig-label {{ font-size:7px; font-weight:700; text-transform:uppercase;
                letter-spacing:0.1em; color:#aaa; margin-bottom:4px; }}
  .footer {{ background:linear-gradient(90deg,{DARK_PURPLE} 0%,{BRAND_PURPLE} 100%);
             padding:8px 20px; display:flex; justify-content:space-between; align-items:center;
             margin-top:14px; border-radius:0 0 3px 3px; }}
  .footer p {{ font-size:7px; color:#c4b5fd; }}
  .footer span {{ font-family:monospace; font-size:8px; color:{BRAND_ORANGE}; font-weight:700; }}
  hr {{ border:none; border-top:1px dashed #e5e7eb; margin:12px 0; }}
</style>
</head><body>
<div class="top-bar"></div>
<div class="header">
  <div>
    <div class="sub">Turnaround Africa</div>
    <h1>GATE PASS</h1>
    <div class="pass-num">{gp.pass_number}</div>
  </div>
  <div class="badge">{status_label}</div>
</div>

<div class="body">
  <!-- QR + Vehicle/Driver -->
  <div style="display:flex;gap:20px;align-items:flex-start;margin-top:4px;">
    <div class="qr-block">
      {qr_img}
      <p>Scan at Gate</p>
    </div>
    <div style="flex:1;">
      <div class="section-title">Vehicle &amp; Driver</div>
      <div class="grid-2">
        {_field("Vehicle Reg.", gp.vehicle_reg, mono=True)}
        {_field("Vehicle Type", gp.vehicle_type or "Commercial Truck")}
        {_field("Driver", gp.driver_name)}
        {_field("Contact", gp.driver_phone, mono=True)}
        {_field("Driver Licence", gp.driver_license, mono=True)}
        {_field("Carrier", gp.carrier_name)}
      </div>
    </div>
  </div>

  <hr/>

  <!-- Cargo & Terminal -->
  <div class="section-title">Cargo &amp; Terminal</div>
  <div class="grid-3">
    {_field("Terminal", gp.terminal_name)}
    {_field("Gate / Bay", gp.terminal_gate)}
    {_field("Container No.", gp.container_number, mono=True)}
    {_field("Customs Seal", gp.customs_seal_number, mono=True)}
    {_field("Cargo Type", gp.cargo_type)}
    {_field("Cargo Weight", weight_str)}
  </div>

  <!-- Validity -->
  <div class="validity">
    <div><div class="vl">Valid From</div><div class="vv">{start_str}</div></div>
    <div><div class="vl">Valid Until</div><div class="vv">{end_str}</div></div>
  </div>

  <!-- Signatures -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-label">Authorising Signature &amp; Date</div>
      <p style="font-size:8px;color:#666;margin-top:4px;">Issued by: {issuer}</p>
      <p style="font-family:monospace;font-size:8px;color:#aaa;margin-top:2px;">{issued_str}</p>
    </div>
    <div class="sig-box dashed">
      <div class="sig-label">Gatehouse Release Stamp &amp; Signature</div>
      <p style="font-size:8px;color:#ccc;font-style:italic;margin-top:6px;">
        To be completed by security at departure
      </p>
    </div>
  </div>

  <p style="font-size:7px;color:#bbb;margin-top:10px;font-style:italic;">
    This pass is valid only for the vehicle, driver, and time window stated above.
    Subject to terminal inspection and identity verification. Present with valid ID.
  </p>
</div>

<div class="footer">
  <p>Present with valid ID · turnaround.africa</p>
  <span>#{gp.pass_number}</span>
</div>
</body></html>"""

    return _html_to_pdf(html)


# ── Demurrage Notice PDF ──────────────────────────────────────────────────────

def render_demurrage_notice_pdf(claim) -> bytes:
    """
    Render a DemurrageClaim ORM object to a formal PDF notice.
    """
    from decimal import Decimal

    def _kes(val) -> str:
        try:
            return f"KES {float(val):,.2f}"
        except Exception:
            return "KES 0.00"

    def _mins(val: int) -> str:
        h, m = divmod(int(val), 60)
        return f"{h}h {m:02d}m" if h else f"{m}m"

    party_labels = {
        "terminal_operator":    "Terminal Operator",
        "customs_authority":    "Customs & Border Authority",
        "shipper":              "Consignee / Shipper",
        "weighbridge_authority":"Weighbridge Authority",
        "rail_freight":         "Rail Freight Station",
    }
    party = party_labels.get(claim.responsible_party.value, claim.responsible_party.value)
    issued_date = claim.created_at.strftime("%d %b %Y") if claim.created_at else "—"
    due_date    = claim.due_date.strftime("%d %b %Y") if claim.due_date else "14 days from issue"
    arrival_str   = claim.arrival_time.strftime("%d %b %Y %H:%M UTC")   if claim.arrival_time   else "—"
    departure_str = claim.departure_time.strftime("%d %b %Y %H:%M UTC") if claim.departure_time else "In Progress"

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page {{ size:A4; margin:20mm 18mm; }}
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#111; font-size:11px; line-height:1.5; }}
  .letterhead {{ display:flex; justify-content:space-between; align-items:flex-start;
                 border-bottom:3px solid {BRAND_PURPLE}; padding-bottom:12px; margin-bottom:16px; }}
  .letterhead h1 {{ font-size:16px; font-weight:900; color:{BRAND_PURPLE}; }}
  .letterhead p  {{ font-size:8px; color:#666; margin-top:2px; }}
  .ref-block {{ text-align:right; }}
  .ref-block .label {{ font-size:7px; font-weight:700; text-transform:uppercase;
                       letter-spacing:0.1em; color:#888; }}
  .ref-block .val   {{ font-family:monospace; font-size:12px; font-weight:700; color:{BRAND_PURPLE}; }}
  .notice-title {{ font-size:13px; font-weight:800; color:{BRAND_PURPLE};
                   text-align:center; margin:16px 0 6px; text-transform:uppercase;
                   letter-spacing:0.05em; }}
  .demand-box {{ background:#FFF7ED; border:1px solid #FDE68A; border-radius:6px;
                 padding:10px 14px; margin:12px 0; display:flex;
                 justify-content:space-between; align-items:center; }}
  .demand-box .dl {{ font-size:8px; font-weight:700; text-transform:uppercase;
                     letter-spacing:0.1em; color:#B45309; }}
  .demand-box .dv {{ font-weight:700; color:#111; font-size:11px; }}
  table.data {{ width:100%; border-collapse:collapse; margin:12px 0; font-size:10px; }}
  table.data th {{ background:{BRAND_PURPLE}; color:#fff; padding:6px 8px;
                   font-size:8px; text-align:left; font-weight:700;
                   text-transform:uppercase; letter-spacing:0.08em; }}
  table.data td {{ padding:6px 8px; border-bottom:1px solid #f0f0f0; }}
  table.data tr:nth-child(even) td {{ background:#f9f9f9; }}
  .calc-box {{ border:1px solid #e5e7eb; border-radius:6px; overflow:hidden; margin:12px 0; }}
  .calc-row {{ display:flex; justify-content:space-between; padding:7px 12px;
               border-bottom:1px solid #f0f0f0; font-size:10px; }}
  .calc-row.total {{ background:{BRAND_ORANGE}15; font-weight:800;
                     font-size:12px; border-bottom:none; color:{BRAND_ORANGE}; }}
  .legal {{ font-size:8px; color:#777; margin-top:14px; line-height:1.6; }}
  .footer {{ margin-top:20px; border-top:1px solid #eee; padding-top:8px;
             display:flex; justify-content:space-between; font-size:7px; color:#aaa; }}
</style>
</head><body>

<div class="letterhead">
  <div>
    <h1>SIGINON GLOBAL LOGISTICS</h1>
    <p>Commercial Fleet Operations &amp; Corridor Recovery Unit</p>
    <p style="color:{BRAND_ORANGE};font-weight:700;font-size:8px;margin-top:2px;">
      Turnaround Telematics — Automated Enforcement
    </p>
  </div>
  <div class="ref-block">
    <div class="label">Notice Number</div>
    <div class="val">{claim.claim_number}</div>
    <div class="label" style="margin-top:4px;">Date Issued</div>
    <div style="font-size:10px;color:#333;">{issued_date}</div>
  </div>
</div>

<div class="notice-title">Formal Demurrage &amp; SLA Breach Notice</div>

<div class="demand-box">
  <div>
    <div class="dl">Demand Served Upon</div>
    <div class="dv">{party}</div>
    <div style="font-size:9px;color:#666;margin-top:2px;">{claim.location_name}</div>
  </div>
  <div style="text-align:right;">
    <div class="dl">Claim Status</div>
    <div class="dv">{claim.status.value.upper()}</div>
  </div>
</div>

<table class="data">
  <tr>
    <th>Vehicle Unit</th><th>Container ISO</th><th>Driver</th><th>Hourly Rate</th>
  </tr>
  <tr>
    <td style="font-family:monospace;font-weight:700;">{claim.vehicle_reg}</td>
    <td style="font-family:monospace;color:#4F46E5;">{claim.container_number or 'N/A'}</td>
    <td>{claim.driver_name or 'Fleet Operator'}</td>
    <td style="font-family:monospace;">{_kes(claim.hourly_operating_rate)}/hr</td>
  </tr>
  <tr>
    <th>Arrival Time</th><th>Departure Time</th><th colspan="2">Facility</th>
  </tr>
  <tr>
    <td>{arrival_str}</td>
    <td>{departure_str}</td>
    <td colspan="2">{claim.location_name}</td>
  </tr>
</table>

<div class="calc-box">
  <div class="calc-row">
    <span>Geofence SLA Baseline Window</span>
    <span>{_mins(claim.sla_threshold_minutes)}</span>
  </div>
  <div class="calc-row">
    <span>Actual Recorded Facility Dwell</span>
    <span>{_mins(claim.total_dwell_minutes)}</span>
  </div>
  <div class="calc-row" style="color:#DC2626;font-weight:700;">
    <span>Net Excess Idling Delay</span>
    <span>+{_mins(claim.excess_delay_minutes)}
      ({claim.excess_delay_minutes/60:.2f} hrs)</span>
  </div>
  <div class="calc-row total">
    <span>Total Assessed Demurrage Liability</span>
    <span>{_kes(claim.claimed_amount_kes)}</span>
  </div>
</div>

{'<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:8px 12px;margin:10px 0;font-size:9px;"><strong>Dispute Reason:</strong> ' + claim.dispute_reason + '</div>' if claim.dispute_reason else ''}
{'<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:8px 12px;margin:10px 0;font-size:9px;"><strong>Notes:</strong> ' + claim.notes + '</div>' if claim.notes else ''}

<p class="legal">
  <strong>Payment &amp; Settlement Terms:</strong> In accordance with East African Freight Corridor SLA
  agreements, demurrage remittances are due within 14 calendar days of notice transmission
  (by {due_date}). Failure to settle within the stipulated period may result in formal arbitration
  proceedings under the East African Community Customs Management Act.<br/><br/>
  <em>Verified by satellite GPS timestamps and entrance/exit geofence polygon telemetry
  recorded on Turnaround (turnaround.africa). All timestamps are UTC.</em>
</p>

<div class="footer">
  <span>Turnaround Africa · turnaround.africa · Automated Fleet Intelligence</span>
  <span>{claim.claim_number}</span>
</div>
</body></html>"""

    return _html_to_pdf(html)
