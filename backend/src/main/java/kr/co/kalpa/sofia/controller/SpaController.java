package kr.co.kalpa.sofia.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping(value = {"/login", "/folder/**", "/image/**", "/settings"})
    public String forward() {
        return "forward:/index.html";
    }
}
