using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.Services;
using Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProvisionController : ControllerBase
{
    private readonly ProvisionService _service;

    public ProvisionController(ProvisionService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<ActionResult<ProvisionResponse>> Provision([FromBody] ProvisionRequest request)
    {
        var userIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { error = "Token không hợp lệ" });
        }

        try
        {
            var result = await _service.ProvisionAsync(request.PreferredName, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

