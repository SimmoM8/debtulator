package com.debtulator.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI debtulatorOpenApi() {
        return new OpenAPI()
                .info(
                        new Info()
                                .title("Debtulator API")
                                .description("Backend API for Debtulator.")
                                .version("v1")
                );
    }
}
