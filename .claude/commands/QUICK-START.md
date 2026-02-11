# ⚡ WAVE Quick Start - Essential Commands

**30-Second Command Reference for Busy Developers**

---

## 🚀 Starting a Story (3 commands)

```bash
/wave-status                    # Check current state
/gate-0 story WAVE-P1-001      # Get CTO approval
/branch create WAVE-P1-001     # Create feature branch
```

## 💻 During Development (4 commands)

```bash
/tdd                           # Test-driven development cycle
/test unit                     # Run tests
/commit                        # Git commit with attribution
/gate-1 && /gate-2 && /gate-3  # Early quality gates
```

## ✅ Finishing a Story (5 commands)

```bash
/test                          # Full test suite
/gate-4 && /gate-5 && /gate-6  # Human review gates
/gate-7                        # Final merge authorization
/pr create WAVE-P1-001         # Create pull request
/done story WAVE-P1-001        # Mark complete
```

## 🚨 Emergency (2 commands)

```bash
/emergency-stop                # Stop everything NOW
/escalate reason "help!"       # Get human assistance
```

---

## 📖 Need More Details?

- **Detailed workflows:** `/claude/commands/IMPORTANT-COMMANDS.md`
- **All commands:** Run `/commands` or see `COMMANDS-REFERENCE.md`
- **Help:** Run `/help` or `/cto` for strategic guidance

---

**The Golden Rule:** Gates 0→1→2→3→4→5→6→7 in order, never skip! ⚠️
