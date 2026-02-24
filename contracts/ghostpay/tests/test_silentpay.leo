// The 'test_silentpay' test program.
import silentpay.aleo;
program test_silentpay.aleo {
    @test
    script test_it() {
        let result: u32 = silentpay.aleo/main(1u32, 2u32);
        assert_eq(result, 3u32);
    }

    @test
    @should_fail
    transition do_nothing() {
        let result: u32 = silentpay.aleo/main(2u32, 3u32);
        assert_eq(result, 3u32);
    }

    @noupgrade
    async constructor() {}
}
