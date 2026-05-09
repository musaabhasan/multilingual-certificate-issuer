# Certificate Revocation And Reissue Workflow

This workflow defines how administrators revoke, supersede, or reissue certificates when a credential contains incorrect data, is reported as fraudulent, uses compromised verification material, or must be withdrawn after issuance. It complements the verification ledger, token rotation, correction, and delivery reconciliation controls by making revocation decisions consistent and auditable.

## Objectives

- Preserve the original certificate hash, batch reference, and delivery evidence even after revocation.
- Separate minor correction, full reissue, fraud response, and token-compromise cases.
- Notify recipients and stakeholders without exposing unnecessary personal data.
- Keep QR and public verification responses accurate after status changes.
- Ensure replacement certificates are linked to revoked or superseded records.
- Document who approved the change, why it was necessary, and what evidence supports closure.

## Revocation Reasons

| Reason | Typical Trigger | Required Action |
| --- | --- | --- |
| Data correction | Misspelled name, wrong date, wrong program, incorrect identifier | Supersede original, issue corrected certificate, preserve original hash |
| Eligibility change | Recipient was later found ineligible | Revoke certificate, notify recipient, document authority decision |
| Fraud report | Forged certificate, altered PDF, suspicious verification attempt | Revoke or mark under investigation, preserve abuse evidence, rotate exposed tokens if needed |
| Duplicate issuance | Same credential issued twice with conflicting numbers | Select authoritative record, supersede duplicate, reconcile delivery proof |
| Template or rendering defect | Wrong seal, signature, language layout, accessibility issue, QR placement defect | Re-render batch or affected subset, reconcile hash manifest |
| Verification-token exposure | QR URL, token list, or lookup secret exposed | Rotate token, update public lookup, notify support team |
| Legal or policy withdrawal | Certificate must be withdrawn by institutional decision | Revoke, restrict public metadata, attach approval evidence |

## Intake Checklist

| Field | Required Evidence |
| --- | --- |
| Case ID | Support ticket, audit event, or incident reference |
| Certificate ID | Certificate number, token ID, batch ID, and PDF hash |
| Reporter | Recipient, issuer, verifier, support team, fraud analyst, or administrator |
| Reason category | One of the revocation reasons above |
| Source of truth | Approved roster, enrollment record, attendance record, program completion record, or signed decision |
| Requested action | Correct, reissue, revoke, supersede, rotate token, or investigate |
| Urgency | Normal, high, fraud, public exposure, legal hold |
| Privacy review | Whether personal data appears in support evidence or notification text |

## Decision Matrix

| Condition | Decision |
| --- | --- |
| Original record is valid but PDF rendering is defective | Supersede and reissue from the same source data |
| Source data was wrong but corrected evidence is approved | Supersede original and reissue corrected certificate |
| Recipient was not eligible | Revoke without replacement unless an authority approves exception handling |
| PDF was altered after delivery | Revoke exposed token if needed and preserve tamper evidence |
| QR token was exposed but certificate content is valid | Rotate verification token and keep PDF hash relationship documented |
| Case is disputed and evidence is incomplete | Mark as under review and restrict high-risk public verification details |

## Operational Steps

1. Freeze the current certificate record, PDF hash, verification token, delivery proof, and public lookup status.
2. Open a revocation or reissue case with a unique case ID.
3. Validate the request against the source of truth and determine whether the issue affects one certificate, a subset, or a full batch.
4. Classify the reason and select the decision path: revoke, supersede, reissue, rotate token, or hold for investigation.
5. Obtain approval from the certificate owner and, where needed, security, legal, registrar, or program leadership.
6. If reissuing, generate the replacement PDF from approved source data and create a new hash manifest entry.
7. Link the replacement certificate to the original certificate with `supersedes` and `superseded_by` references.
8. Update the public verification response to show the correct state without exposing unnecessary case details.
9. Notify the recipient and operational stakeholders using privacy-minimized language.
10. Close the case only after ledger status, token state, delivery evidence, and support evidence reconcile.

## Public Verification States

| State | Public Meaning | Internal Evidence |
| --- | --- | --- |
| Valid | Certificate is current and hash matches | Active certificate, delivery proof, hash manifest |
| Superseded | A newer certificate replaced this one | Replacement certificate ID, reason, approval, old and new hashes |
| Revoked | Certificate is no longer valid | Authority decision, revocation reason, date, notification evidence |
| Under review | Certificate requires issuer confirmation | Case ID, investigation owner, restricted public metadata |
| Token rotated | Verification link changed but credential remains valid | Old token hash, new token hash, rotation authority |

## Notification Guidance

- Do not send full source-of-truth records in email notifications.
- Include certificate ID, action taken, support reference, and next steps.
- For fraud or abuse cases, avoid disclosing detection logic or token patterns.
- For corrected certificates, explain that the previous certificate should no longer be used.
- For revocations without replacement, include the approving authority or support route.
- Record SMTP message ID, delivery outcome, bounce state, and any manual contact evidence.

## Evidence Requirements

| Evidence | Purpose |
| --- | --- |
| Original PDF hash | Preserves the issued artifact |
| Replacement PDF hash | Proves the corrected artifact |
| Source-of-truth reference | Supports the correction or withdrawal decision |
| Approval record | Shows revocation authority |
| Token rotation record | Shows QR and lookup state changes |
| Recipient notification evidence | Shows communication was completed or attempted |
| Public verification receipt | Confirms final lookup response |
| Support-case redaction record | Supports safe evidence sharing |

## Closure Checklist

- Original certificate status is valid, superseded, revoked, under review, or token rotated.
- Replacement certificate is linked when one was issued.
- Old and new PDF hashes are retained.
- QR/token state is updated and tested.
- Verification response does not expose sensitive case details.
- Recipient notification is sent, bounced, or manually documented.
- Fraud, abuse, or token-exposure cases have containment evidence.
- Support case evidence is redacted before external sharing.
- Batch manifest and delivery reconciliation reflect the final state.
