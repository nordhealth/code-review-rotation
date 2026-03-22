<script setup lang="ts">
useHead({ title: 'Email Templates | Nord Review' })

const previews = [
  {
    name: 'Email Confirmation',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8f8fa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8fa; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td style="padding: 0 0 24px 0;">
              <img src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI2IiB2aWV3Qm94PSIwIDAgMTUwIDE1MCIgd2lkdGg9IjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IGZpbGw9IiMzNTU5YzciIGhlaWdodD0iMTUwIiByeD0iMzMiIHdpZHRoPSIxNTAiLz48ZyBmaWxsPSIjZmZmIj48cGF0aCBkPSJtMTA0LjQ2IDEyMS4wODFjLTQuMTM3IDAtOC4wNzUxLTEuNTkxLTExLjAxODctNC41MzVsLS4wNzk1LS4wNzljLS4wNzk2LS4wNC0uMTE5NC0uMTItLjE5ODktLjE2bC00MS40ODg2LTQxLjkyNTcgNi43NjIzLTYuNzYyMyA0MS40MDkgNDAuMjU1LjA3OTYuMDhjLjA3OTguMDQuMTE4OC4xMTkuMTk4OC4xOTkgMS4xNTQgMS4xNTQgMi43MDUgMS44MyA0LjMzNiAxLjgzIDMuMzgxIDAgNi41NjMtMi43ODUgNi41NjMtNi4yNDV2LTU4LjM1NWMwLTMuNDYwNy0zLjE0Mi02LjI0NTEtNi41NjMtNi4yNDUxLTEuNTUxIDAtMy4xMDMuNjM2NC00LjI1NiAxLjc1MDJsLS4xMi4xMTkzLTE5LjU3MDYgMTcuOTc5OC02Ljc2MjItNi43NjIzIDE5LjM3MTktMTkuMzcyYy4wMzk4LS4wMzk3LjA3OTYtLjExOTMuMTU5MS0uMTU5MSAyLjk4MzQtMi45ODMzIDcuMDQwOC00LjY5MzggMTEuMTc3OC00LjY5MzggOC41OTIgMCAxNS45OTEgNi45NjEyIDE2LjExIDE1LjU1MzJ2NjIuMDEzOGMtLjE1OSA4LjU5Mi03LjU1OCAxNS41MTQtMTYuMTEgMTUuNTE0eiIvPjxwYXRoIGQ9Im00NC43MTI0IDI4YzQuMTM2OSAwIDguMDc0OSAxLjU5MTEgMTEuMDE4NSA0LjUzNDdsLjA3OTUuMDc5NmMuMDc5Ni4wMzk3LjExOTQuMTE5My4xOTg5LjE1OTFsNDEuODg2NCA0MS41MjgzLTYuNzYyMyA2Ljc2MjMtNDEuODA2OC0zOS44NTc3LS4wNzk1LS4wNzk1Yy0uMDc5Ni0uMDM5OC0uMTE5NC0uMTE5NC0uMTk4OS0uMTk4OS0xLjE1MzYtMS4xNTM2LTIuNzA0OS0xLjgyOTgtNC4zMzU4LTEuODI5OC0zLjM4MTIgMC02LjE2NTcgMi43ODQ1LTYuMTY1NyA2LjI0NTJ2NTguMzU0N2MwIDMuNDYgMi43NDQ3IDYuMjQ1IDYuMTY1NyA2LjI0NSAxLjU1MTMgMCAzLjEwMjYtLjYzNiA0LjI1NjItMS43NWwuMTE5My0uMTIgMTkuNTcwOS0xNy45NzkzIDYuNzYyMyA2Ljc2MjItMTkuMzcyIDE5LjM3MjFjLS4wMzk4LjA0LS4wNzk1LjExOS0uMTU5MS4xNTktMi45ODMzIDIuOTgzLTcuMDQwNyA0LjY5NC0xMS4xNzc2IDQuNjk0LTguNTkyMSAwLTE1LjU5MzEtNi45NjEtMTUuNzEyNC0xNS41NTN2LTYyLjAxNDVjLjE1OTEtOC41OTIxIDcuMTYwMS0xNS41MTM1IDE1LjcxMjQtMTUuNTEzNXoiLz48L2c+PC9zdmc+Cg==" alt="Nordhealth" width="32" height="32" style="display: inline-block; vertical-align: middle; margin-right: 4px;" />
              <span style="font-size: 18px; font-weight: 600; color: #222328; letter-spacing: -0.3px; vertical-align: middle;">Review</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e1e1e3; padding: 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #222328;">Welcome to Nord Review</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #717179; line-height: 1.6;">Hi João,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #3c3c43; line-height: 1.6;">
                Click the button below to confirm your email and activate your account:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #2D67F5; border-radius: 6px;">
                    <a href="#" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #717179; line-height: 1.5;">
                Or copy this link into your browser:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 12px; word-break: break-all; line-height: 1.5;">
                <a href="#" style="color: #2D67F5;">https://nordreview.nordhealth.com/confirm?token=abc123def456</a>
              </p>
              <div style="border-top: 1px solid #e1e1e3; padding-top: 16px; margin-top: 8px;">
                <p style="margin: 0; font-size: 12px; color: #717179; line-height: 1.5;">This link expires in 24 hours.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #717179; line-height: 1.5;">
                This is an automated message from Nord Review.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Password Reset',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8f8fa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8fa; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td style="padding: 0 0 24px 0;">
              <img src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI2IiB2aWV3Qm94PSIwIDAgMTUwIDE1MCIgd2lkdGg9IjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IGZpbGw9IiMzNTU5YzciIGhlaWdodD0iMTUwIiByeD0iMzMiIHdpZHRoPSIxNTAiLz48ZyBmaWxsPSIjZmZmIj48cGF0aCBkPSJtMTA0LjQ2IDEyMS4wODFjLTQuMTM3IDAtOC4wNzUxLTEuNTkxLTExLjAxODctNC41MzVsLS4wNzk1LS4wNzljLS4wNzk2LS4wNC0uMTE5NC0uMTItLjE5ODktLjE2bC00MS40ODg2LTQxLjkyNTcgNi43NjIzLTYuNzYyMyA0MS40MDkgNDAuMjU1LjA3OTYuMDhjLjA3OTguMDQuMTE4OC4xMTkuMTk4OC4xOTkgMS4xNTQgMS4xNTQgMi43MDUgMS44MyA0LjMzNiAxLjgzIDMuMzgxIDAgNi41NjMtMi43ODUgNi41NjMtNi4yNDV2LTU4LjM1NWMwLTMuNDYwNy0zLjE0Mi02LjI0NTEtNi41NjMtNi4yNDUxLTEuNTUxIDAtMy4xMDMuNjM2NC00LjI1NiAxLjc1MDJsLS4xMi4xMTkzLTE5LjU3MDYgMTcuOTc5OC02Ljc2MjItNi43NjIzIDE5LjM3MTktMTkuMzcyYy4wMzk4LS4wMzk3LjA3OTYtLjExOTMuMTU5MS0uMTU5MSAyLjk4MzQtMi45ODMzIDcuMDQwOC00LjY5MzggMTEuMTc3OC00LjY5MzggOC41OTIgMCAxNS45OTEgNi45NjEyIDE2LjExIDE1LjU1MzJ2NjIuMDEzOGMtLjE1OSA4LjU5Mi03LjU1OCAxNS41MTQtMTYuMTEgMTUuNTE0eiIvPjxwYXRoIGQ9Im00NC43MTI0IDI4YzQuMTM2OSAwIDguMDc0OSAxLjU5MTEgMTEuMDE4NSA0LjUzNDdsLjA3OTUuMDc5NmMuMDc5Ni4wMzk3LjExOTQuMTE5My4xOTg5LjE1OTFsNDEuODg2NCA0MS41MjgzLTYuNzYyMyA2Ljc2MjMtNDEuODA2OC0zOS44NTc3LS4wNzk1LS4wNzk1Yy0uMDc5Ni0uMDM5OC0uMTE5NC0uMTE5NC0uMTk4OS0uMTk4OS0xLjE1MzYtMS4xNTM2LTIuNzA0OS0xLjgyOTgtNC4zMzU4LTEuODI5OC0zLjM4MTIgMC02LjE2NTcgMi43ODQ1LTYuMTY1NyA2LjI0NTJ2NTguMzU0N2MwIDMuNDYgMi43NDQ3IDYuMjQ1IDYuMTY1NyA2LjI0NSAxLjU1MTMgMCAzLjEwMjYtLjYzNiA0LjI1NjItMS43NWwuMTE5My0uMTIgMTkuNTcwOS0xNy45NzkzIDYuNzYyMyA2Ljc2MjItMTkuMzcyIDE5LjM3MjFjLS4wMzk4LjA0LS4wNzk1LjExOS0uMTU5MS4xNTktMi45ODMzIDIuOTgzLTcuMDQwNyA0LjY5NC0xMS4xNzc2IDQuNjk0LTguNTkyMSAwLTE1LjU5MzEtNi45NjEtMTUuNzEyNC0xNS41NTN2LTYyLjAxNDVjLjE1OTEtOC41OTIxIDcuMTYwMS0xNS41MTM1IDE1LjcxMjQtMTUuNTEzNXoiLz48L2c+PC9zdmc+Cg==" alt="Nordhealth" width="32" height="32" style="display: inline-block; vertical-align: middle; margin-right: 4px;" />
              <span style="font-size: 18px; font-weight: 600; color: #222328; letter-spacing: -0.3px; vertical-align: middle;">Review</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e1e1e3; padding: 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #222328;">Password Reset</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #717179; line-height: 1.6;">Hi João,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #3c3c43; line-height: 1.6;">
                You requested a password reset. Click the button below to set a new password:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #2D67F5; border-radius: 6px;">
                    <a href="#" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #717179; line-height: 1.5;">
                Or copy this link into your browser:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 12px; word-break: break-all; line-height: 1.5;">
                <a href="#" style="color: #2D67F5;">https://nordreview.nordhealth.com/reset-password?token=xyz789abc012</a>
              </p>
              <div style="border-top: 1px solid #e1e1e3; padding-top: 16px; margin-top: 8px;">
                <p style="margin: 0; font-size: 12px; color: #717179; line-height: 1.5;">
                  This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #717179; line-height: 1.5;">
                This is an automated message from Nord Review.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Invite',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8f8fa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8fa; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td style="padding: 0 0 24px 0;">
              <img src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI2IiB2aWV3Qm94PSIwIDAgMTUwIDE1MCIgd2lkdGg9IjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IGZpbGw9IiMzNTU5YzciIGhlaWdodD0iMTUwIiByeD0iMzMiIHdpZHRoPSIxNTAiLz48ZyBmaWxsPSIjZmZmIj48cGF0aCBkPSJtMTA0LjQ2IDEyMS4wODFjLTQuMTM3IDAtOC4wNzUxLTEuNTkxLTExLjAxODctNC41MzVsLS4wNzk1LS4wNzljLS4wNzk2LS4wNC0uMTE5NC0uMTItLjE5ODktLjE2bC00MS40ODg2LTQxLjkyNTcgNi43NjIzLTYuNzYyMyA0MS40MDkgNDAuMjU1LjA3OTYuMDhjLjA3OTguMDQuMTE4OC4xMTkuMTk4OC4xOTkgMS4xNTQgMS4xNTQgMi43MDUgMS44MyA0LjMzNiAxLjgzIDMuMzgxIDAgNi41NjMtMi43ODUgNi41NjMtNi4yNDV2LTU4LjM1NWMwLTMuNDYwNy0zLjE0Mi02LjI0NTEtNi41NjMtNi4yNDUxLTEuNTUxIDAtMy4xMDMuNjM2NC00LjI1NiAxLjc1MDJsLS4xMi4xMTkzLTE5LjU3MDYgMTcuOTc5OC02Ljc2MjItNi43NjIzIDE5LjM3MTktMTkuMzcyYy4wMzk4LS4wMzk3LjA3OTYtLjExOTMuMTU5MS0uMTU5MSAyLjk4MzQtMi45ODMzIDcuMDQwOC00LjY5MzggMTEuMTc3OC00LjY5MzggOC41OTIgMCAxNS45OTEgNi45NjEyIDE2LjExIDE1LjU1MzJ2NjIuMDEzOGMtLjE1OSA4LjU5Mi03LjU1OCAxNS41MTQtMTYuMTEgMTUuNTE0eiIvPjxwYXRoIGQ9Im00NC43MTI0IDI4YzQuMTM2OSAwIDguMDc0OSAxLjU5MTEgMTEuMDE4NSA0LjUzNDdsLjA3OTUuMDc5NmMuMDc5Ni4wMzk3LjExOTQuMTE5My4xOTg5LjE1OTFsNDEuODg2NCA0MS41MjgzLTYuNzYyMyA2Ljc2MjMtNDEuODA2OC0zOS44NTc3LS4wNzk1LS4wNzk1Yy0uMDc5Ni0uMDM5OC0uMTE5NC0uMTE5NC0uMTk4OS0uMTk4OS0xLjE1MzYtMS4xNTM2LTIuNzA0OS0xLjgyOTgtNC4zMzU4LTEuODI5OC0zLjM4MTIgMC02LjE2NTcgMi43ODQ1LTYuMTY1NyA2LjI0NTJ2NTguMzU0N2MwIDMuNDYgMi43NDQ3IDYuMjQ1IDYuMTY1NyA2LjI0NSAxLjU1MTMgMCAzLjEwMjYtLjYzNiA0LjI1NjItMS43NWwuMTE5My0uMTIgMTkuNTcwOS0xNy45NzkzIDYuNzYyMyA2Ljc2MjItMTkuMzcyIDE5LjM3MjFjLS4wMzk4LjA0LS4wNzk1LjExOS0uMTU5MS4xNTktMi45ODMzIDIuOTgzLTcuMDQwNyA0LjY5NC0xMS4xNzc2IDQuNjk0LTguNTkyMSAwLTE1LjU5MzEtNi45NjEtMTUuNzEyNC0xNS41NTN2LTYyLjAxNDVjLjE1OTEtOC41OTIxIDcuMTYwMS0xNS41MTM1IDE1LjcxMjQtMTUuNTEzNXoiLz48L2c+PC9zdmc+Cg==" alt="Nordhealth" width="32" height="32" style="display: inline-block; vertical-align: middle; margin-right: 4px;" />
              <span style="font-size: 18px; font-weight: 600; color: #222328; letter-spacing: -0.3px; vertical-align: middle;">Review</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e1e1e3; padding: 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #222328;">You're invited to Nord Review</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #3c3c43; line-height: 1.6;">
                An admin has invited you to join Nord Review, the code review rotation tool. Click the button below to create your account:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="background-color: #2D67F5; border-radius: 6px;">
                    <a href="#" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none;">
                      Create Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #717179; line-height: 1.5;">
                Or copy this link into your browser:
              </p>
              <p style="margin: 0 0 0 0; font-size: 12px; word-break: break-all; line-height: 1.5;">
                <a href="#" style="color: #2D67F5;">https://nordreview.nordhealth.com/register?email=colleague@nordhealth.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #717179; line-height: 1.5;">
                This is an automated message from Nord Review.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
]

const activePreview = ref(0)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Email Templates" description="Preview how emails look to recipients." />

    <div class="flex gap-2">
      <UIButton
        v-for="(preview, index) in previews"
        :key="preview.name"
        type="button"
        :variant="activePreview === index ? 'default' : 'outline'"
        size="sm"
        @click="activePreview = index"
      >
        {{ preview.name }}
      </UIButton>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <div class="border-b bg-muted/50 px-4 py-2">
        <span class="text-xs font-medium text-muted-foreground">{{ previews[activePreview].name }}</span>
      </div>
      <iframe
        :srcdoc="previews[activePreview].html"
        class="h-[600px] w-full bg-white"
        sandbox=""
      />
    </div>
  </div>
</template>
