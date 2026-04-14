#include <stdio.h>
#include <sys/ptrace.h>
#include <string.h>

int main(int argc, char* argv[]) {
    if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
        printf("I sense a debugger! Aborting...\n");
        return 1;
    }
    
    if (argc < 2) {
        printf("Usage: ./trap [password]\n");
        return 1;
    }
    
    if (strcmp(argv[1], "N0_D3BUGG3R_PLZ") == 0) {
        printf("Access granted: bxf{4nt1_d3bug_byp4ss3d}\n");
    } else {
        printf("Incorrect password.\n");
    }
    return 0;
}
