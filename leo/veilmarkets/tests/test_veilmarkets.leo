// The 'test_veilmarkets' test program.
import veilmarkets.aleo;
program test_veilmarkets.aleo {
    @test
    script test_it() {
        let result: u32 = veilmarkets.aleo/main(1u32, 2u32);
        assert_eq(result, 3u32);
    }

    @test
    @should_fail
    transition do_nothing() {
        let result: u32 = veilmarkets.aleo/main(2u32, 3u32);
        assert_eq(result, 3u32);
    }

    @noupgrade
    async constructor() {}
}
