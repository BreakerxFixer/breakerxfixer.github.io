#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    int secret = 0xdeadbeef;
    char buffer[32];
    
    printf("Welcome to Pwn 101. Overwrite the secret!\n");
    printf("Input: ");
    scanf("%s", buffer); // VULNERABILITY!
    
    if (secret != 0xdeadbeef) {
        printf("WOW! You overwrote the secret variables!\n");
        printf("Flag: bxf{buff3r_0v3rfl0w_34sy_p34sy}\n");
    } else {
        printf("Secret is safely 0x%x\n", secret);
    }
    return 0;
}
