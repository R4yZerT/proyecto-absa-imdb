---
description: Detect and install AI skills for this project
---
Use the `autoskills` tool immediately. Do not answer from memory and do not inspect project files yourself.

Exact workflow:
1. Call the `autoskills` tool with `action: "detect"`.
2. Show the detected technologies / suggested skills to the user.
3. Ask which skills they want to keep. Wait for explicit confirmation.
4. Call the `autoskills` tool again with `action: "install"` and pass the user's selected skill directory names in `keep`.
5. Confirm which skills remain installed in `.agents/skills/`.