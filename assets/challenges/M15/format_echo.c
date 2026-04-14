#include <stdio.h>

char *secret = "bxf{f0rm4t_str1ng_m3m0ry_l34k}";

int main() {
    char input[64];
    printf("Echo service. Say something: ");
    fgets(input, sizeof(input), stdin);
    printf("You said: ");
    printf(input); // VULNERABILITY!
    printf("\n");
    return 0;
}
