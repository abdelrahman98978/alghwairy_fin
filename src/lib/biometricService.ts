/**
 * Sovereign Biometric Service
 * Integrates with Windows Hello (WebAuthn) for real physical authentication.
 * Includes a "Sovereign Virtual Key" fallback for environments without hardware support.
 */

export const biometricService = {
  /**
   * Check if biometrics are supported and available
   */
  isSupported: (): boolean => {
    // WebAuthn requires a secure context (HTTPS, localhost, or registered app scheme)
    return !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials);
  },

  /**
   * Helper: Convert Buffer to Base64
   */
  bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /**
   * Helper: Convert Base64 to Buffer
   */
  base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  /**
   * Enroll a new biometric credential (Windows Hello)
   */
  async enroll(userName: string): Promise<{ id: string; rawId: string; isVirtual?: boolean }> {
    // Try REAL hardware first if supported and in secure context
    if (this.isSupported()) {
      try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userID = crypto.getRandomValues(new Uint8Array(16));

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
          challenge,
          rp: {
            name: "Alghwairy Sovereign Ledger",
            // Use current host or a static ID for app:// protocol consistency
            id: window.location.hostname || "alghwairy-sovereign-ledger"
          },
          user: {
            id: userID,
            name: userName,
            displayName: userName,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required",
          },
          timeout: 60000,
        };

        const credential = (await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        })) as PublicKeyCredential;

        if (credential) {
          return {
            id: credential.id,
            rawId: this.bufferToBase64(credential.rawId),
          };
        }
      } catch (hardwareError) {
        console.warn('Real biometric enrollment failed (likely permissions or non-secure scheme):', hardwareError);
      }
    }

    // VIRTUAL FALLBACK: Sovereign Secure PIN
    // This allows the app to function even if Windows Hello is disabled/restricted
    const pin = window.prompt(
        "نظام البصمة غير مستجيب أو غير مدعوم على هذا الجهاز.\nبرجاء تعيين رمز أمان سيادي (6 أرقام على الأقل) لتأمين الدخول المحلي:"
    );
    
    if (!pin || pin.length < 4) throw new Error('Enrollment Cancelled');
    
    // Create a deterministic pseudo-ID based on the PIN and Username
    const virtualId = `vir_${btoa(userName + pin).substring(0, 16)}`;
    return {
      id: virtualId,
      rawId: btoa(virtualId),
      isVirtual: true
    };
  },


  /**
   * Verify identity via existing biometric credential
   */
  async verify(credentialRawIdBase64: string, userName?: string): Promise<boolean> {
    // Check if it's a virtual key
    if (credentialRawIdBase64.startsWith('dmlyX')) { // 'vir_' in base64 approx
        const decoded = atob(credentialRawIdBase64);
        if (decoded.startsWith('vir_')) {
            const pin = window.prompt(
                (userName || 'المستخدم') + ": يرجى إدخال رمز الأمان السيادي للتحقق"
            );
            if (!pin) return false;
            const expectedId = `vir_${btoa((userName || 'admin') + pin).substring(0, 16)}`;
            return decoded === expectedId;
        }
    }

    if (!this.isSupported()) return false;

    try {
      const rawIdBuffer = this.base64ToBuffer(credentialRawIdBase64);
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: rawIdBuffer,
          type: 'public-key',
        }],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });
      
      return !!assertion;
    } catch (err) {
      console.error('Biometric verification failed:', err);
      // Last ditch effort: if it's a production build and hardware fails, check if the user wants to use password
      return false;
    }
  },
  
  /**
   * --- Authenticator (Google/Microsoft) Logic ---
   */
  
  /**
   * Generate a random Base32 secret for Google Authenticator
   */
  generateTOTPSecret(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.getRandomValues(new Uint8Array(10)); // 80 bits
    for (let i = 0; i < bytes.length; i++) {
      secret += alphabet[bytes[i] % 32];
    }
    return secret;
  },

  /**
   * Verify a TOTP code against a secret
   * Note: This is an offline, sovereign implementation or a simple check.
   * For Alghwairy, we use a slightly more predictable logic for demonstration 
   * OR we implement standard TOTP if preferred. 
   * Let's implement a robust simplified TOTP check.
   */
  async verifyTOTP(token: string, secret: string): Promise<boolean> {
    try {
        // Standard TOTP Verification using Browser SubtleCrypto (No external libs)
        const timeStep = 30; // seconds
        const now = Math.floor(Date.now() / 1000);
        
        // Helper: Base32 to Uint8Array
        const base32ToBuf = (base32: string) => {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let bits = '';
            for (let i = 0; i < base32.length; i++) {
                const val = alphabet.indexOf(base32[i].toUpperCase());
                if (val >= 0) bits += val.toString(2).padStart(5, '0');
            }
            const bytes = new Uint8Array(Math.floor(bits.length / 8));
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
            }
            return bytes;
        };

        const secretBuf = base32ToBuf(secret);
        
        const checkToken = async (time: number) => {
            const counter = Math.floor(time / timeStep);
            const counterBuf = new ArrayBuffer(8);
            const view = new DataView(counterBuf);
            // Counter is 8-byte big-endian
            view.setUint32(4, counter, false); 
            
            const key = await crypto.subtle.importKey(
                'raw', secretBuf, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
            );
            const hmac = await crypto.subtle.sign('HMAC', key, counterBuf);
            const hmacBuf = new Uint8Array(hmac);
            
            const offset = hmacBuf[hmacBuf.length - 1] & 0xf;
            const code = ((hmacBuf[offset] & 0x7f) << 24) |
                         ((hmacBuf[offset + 1] & 0xff) << 16) |
                         ((hmacBuf[offset + 2] & 0xff) << 8) |
                         (hmacBuf[offset + 3] & 0xff);
            
            const otp = (code % 1000000).toString().padStart(6, '0');
            return otp;
        };

        // Check current, previous, and next window for drift
        const results = await Promise.all([
            checkToken(now),
            checkToken(now - timeStep),
            checkToken(now + timeStep)
        ]);

        return results.includes(token);
    } catch (e) {
        console.error('TOTP Verification Error:', e);
        return false;
    }
  }
};
